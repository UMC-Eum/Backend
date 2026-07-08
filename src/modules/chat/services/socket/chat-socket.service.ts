import { Injectable, Logger } from '@nestjs/common';
import { ActiveStatus, ChatMediaType, NotificationType } from '@prisma/client';
import type { Server } from 'socket.io';

import { AppException } from '../../../../common/errors/app.exception';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { NotificationService } from '../../../notification/services/notification.service';
import { buildMessagePreview } from '../../utils/message-preview.util';
import { CHAT_SEND_TYPES, type ChatSendType } from '../../dtos/message.dto';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ChatMediaService } from '../chat-media/chat-media.service';
import {
  toChatRoom,
  toUserRoom,
} from '../../../../infra/websocket/utils/ws-rooms.util';
import {
  shorten,
  toPositiveInt,
} from '../../../../infra/websocket/utils/ws-parse.util';

export type JoinRoomBody = { chatRoomId: number };

export type SendMessageBody = {
  chatRoomId: number;
  type: ChatMediaType;
  text?: string | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
};

function isUserSendableChatMediaType(v: unknown): v is ChatSendType {
  return (
    typeof v === 'string' && (CHAT_SEND_TYPES as readonly string[]).includes(v)
  );
}

@Injectable()
export class ChatSocketService {
  private readonly logger = new Logger(ChatSocketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly participantRepo: ParticipantRepository,
    private readonly messageRepo: MessageRepository,
    private readonly roomRepo: RoomRepository,
    private readonly clubRepo: ClubRepository,
    private readonly chatMediaService: ChatMediaService,
    private readonly notificationService: NotificationService,
  ) {}

  async joinRoom(userId: number, body: JoinRoomBody): Promise<number> {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'chatRoomId가 올바르지 않습니다.',
      });
    }

    const me = BigInt(userId);
    const roomId = BigInt(chatRoomId);

    const ok = await this.participantRepo.isParticipant(me, roomId);
    if (!ok) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    // TODO(EUM-29 follow-up): 클럽 leave/kick 시 ChatParticipant.endedAt cascade
    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    if (roomInfo?.type === 'CLUB') {
      if (roomInfo.clubId == null) {
        throw new AppException('CHAT_ROOM_ACCESS_FAILED');
      }
      const member = await this.clubRepo.findActiveClubUser(
        me,
        roomInfo.clubId,
      );
      if (!member) {
        throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
      }
    }

    return chatRoomId;
  }

  async sendMessage(server: Server, userId: number, body: SendMessageBody) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'chatRoomId가 올바르지 않습니다.',
      });
    }

    this.logger.debug(
      `message.send recv room=${chatRoomId} user=${userId} type=${String(body?.type)}`,
    );

    const type = body?.type;
    if (!isUserSendableChatMediaType(type)) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '메시지 타입이 올바르지 않습니다.',
      });
    }

    const me = BigInt(userId);
    const roomId = BigInt(chatRoomId);

    const isParticipant = await this.participantRepo.isParticipant(me, roomId);
    if (!isParticipant) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    if (!roomInfo) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    // 알림 fan-out 대상 산정 (DIRECT: 상대 1명 / CLUB: 발신자 제외 전원)
    let recipientUserIds: number[];
    if (roomInfo.type === 'CLUB') {
      if (roomInfo.clubId == null) {
        throw new AppException('CHAT_ROOM_ACCESS_FAILED');
      }
      const member = await this.clubRepo.findActiveClubUser(
        me,
        roomInfo.clubId,
      );
      if (!member) {
        throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
      }
      const ids = await this.participantRepo.getActiveParticipantUserIds(
        roomId,
        me,
      );
      recipientUserIds = ids.map(Number);
    } else {
      const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
      if (!peerUserId) {
        throw new AppException('CHAT_ROOM_ACCESS_FAILED');
      }
      const isBlocked = await this.participantRepo.isBlockedBetweenUsers(
        me,
        peerUserId,
      );
      if (isBlocked) {
        throw new AppException('CHAT_MESSAGE_BLOCKED');
      }
      recipientUserIds = [Number(peerUserId)];
    }

    if (type === 'TEXT') {
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!text) {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: '텍스트 메시지는 내용이 필요합니다.',
        });
      }
    } else {
      const mediaUrl =
        typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      if (!mediaUrl) {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: '미디어 메시지는 mediaUrl이 필요합니다.',
        });
      }

      if (type === 'AUDIO' || type === 'VIDEO') {
        const durationSec = toPositiveInt(body?.durationSec);
        if (!durationSec) {
          throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
            message: '오디오/비디오 메시지는 durationSec이 필요합니다.',
          });
        }
      }

      this.logger.debug(
        `message.send media room=${chatRoomId} user=${userId} type=${type} mediaUrl=${shorten(mediaUrl)} durationSec=${String(body?.durationSec)}`,
      );
    }

    const storedMediaRef =
      type !== 'TEXT' && typeof body.mediaUrl === 'string'
        ? this.chatMediaService.normalizeChatMediaRef(chatRoomId, body.mediaUrl)
        : null;

    const durationSec =
      type === 'AUDIO' || type === 'VIDEO'
        ? (toPositiveInt(body.durationSec) ?? null)
        : null;

    const message = await this.messageRepo.createMessage(
      roomId,
      me,
      type,
      type === 'TEXT' ? (body.text ?? null) : null,
      type !== 'TEXT' ? storedMediaRef : null,
      durationSec,
    );

    const clientMediaUrl =
      await this.chatMediaService.toClientUrl(storedMediaRef);

    const payload = {
      messageId: Number(message.id),
      chatRoomId,
      senderUserId: userId,
      type,
      text: type === 'TEXT' ? (body.text ?? null) : null,
      mediaUrl: type !== 'TEXT' ? clientMediaUrl : null,
      durationSec,
      sentAt: message.sentAt.toISOString(),
      isSystem: false,
    };

    server.to(toChatRoom(chatRoomId)).emit('message.new', payload);

    void this.notifyNewMessage(server, {
      receiverUserIds: recipientUserIds,
      senderUserId: userId,
      chatRoomId,
      messageId: Number(message.id),
      messageType: type,
      text: type === 'TEXT' ? (body.text ?? null) : null,
    });

    return {
      ok: true,
      messageId: Number(message.id),
      sentAt: message.sentAt.toISOString(),
    };
  }

  private async notifyNewMessage(
    server: Server,
    params: {
      receiverUserIds: number[];
      senderUserId: number;
      chatRoomId: number;
      messageId: number;
      messageType: ChatMediaType;
      text: string | null;
    },
  ): Promise<void> {
    if (params.receiverUserIds.length === 0) return;

    try {
      const sender = await this.prisma.user.findFirst({
        where: {
          id: BigInt(params.senderUserId),
          deletedAt: null,
          status: ActiveStatus.ACTIVE,
        },
        select: { nickname: true },
      });

      const title = sender?.nickname ?? '새 메시지';
      const preview = buildMessagePreview(params.messageType, params.text);

      // 그룹은 참여자 전원에게 fan-out (발신자 제외는 호출부에서 처리)
      for (const receiverUserId of params.receiverUserIds) {
        const created = await this.notificationService.createNotification(
          receiverUserId,
          NotificationType.CHAT,
          title,
          preview.textPreview,
          params.senderUserId,
          {
            chatRoomId: String(params.chatRoomId),
            messageId: String(params.messageId),
            senderUserId: String(params.senderUserId),
          },
        );

        server.to(toUserRoom(receiverUserId)).emit('notification.new', {
          notificationId: created.id.toString(),
          type: created.type,
          title: created.title,
          body: created.body,
          isRead: created.isRead,
          createdAt: created.createdAt.toISOString(),
          data: {
            chatRoomId: params.chatRoomId,
            messageId: params.messageId,
            senderUserId: params.senderUserId,
          },
        });
      }
    } catch (e) {
      this.logger.warn(`notifyNewMessage failed: ${String(e)}`);
    }
  }
}
