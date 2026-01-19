import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { decodeCursor, encodeCursor } from '../../utils/cursor.util';

import type {
  ListMessagesQueryDto,
  ListMessagesRes,
  MessageItem,
  SendMessageDto,
  SendMessageRes,
} from '../../dtos/message.dto';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

function calcAge(birthdate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) {
    age -= 1;
  }

  return age;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly roomRepo: RoomRepository,
  ) {}

  async listMessages(
    meUserId: number,
    chatRoomId: number,
    query: ListMessagesQueryDto,
  ): Promise<ListMessagesRes> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const isParticipant = await this.participantRepo.isParticipant(me, roomId);
    if (!isParticipant) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const peerDetail = await this.roomRepo.getPeerDetail(peerUserId);
    if (!peerDetail) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const addr = await this.roomRepo.getAddressByCode(peerDetail.code);
    const areaName =
      addr?.emdName ??
      addr?.sigunguName ??
      addr?.sidoName ??
      addr?.fullName ??
      null;

    const size = query.size ?? 30;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorSentAt = cursor ? new Date(cursor.sortAt) : null;
    const cursorMessageId =
      cursor && 'messageId' in cursor ? BigInt(cursor.messageId) : null;

    const messages = await this.messageRepo.findMessagesByRoomId(
      roomId,
      cursorSentAt,
      cursorMessageId,
      size,
    );

    const hasNext = messages.length > size;
    const page = hasNext ? messages.slice(0, size) : messages;

    const items: MessageItem[] = page.map((msg) => {
      const media = msg.chatMedia[0] ?? null;
      const isMine = msg.sentById === me;

      return {
        messageId: Number(msg.id),
        type: media?.type ?? 'TEXT',
        text: media?.text ?? null,
        mediaUrl: media?.url ?? null,
        durationSec: media?.durationSec ?? null,
        senderUserId: Number(msg.sentById),
        sentAt: msg.sentAt.toISOString(),
        readAt: msg.readAt?.toISOString() ?? null,
        isMine,
      };
    });

    const nextCursor =
      hasNext && page.length > 0
        ? encodeCursor({
            sortAt: page[page.length - 1].sentAt.toISOString(),
            messageId: page[page.length - 1].id.toString(),
          })
        : null;

    return {
      chatRoomId,
      peer: {
        userId: Number(peerDetail.id),
        nickname: peerDetail.nickname,
        age: calcAge(peerDetail.birthdate),
        areaName,
      },
      items,
      nextCursor,
    };
  }

  async sendMessage(
    meUserId: number,
    chatRoomId: number,
    dto: SendMessageDto,
  ): Promise<SendMessageRes> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const isParticipant = await this.participantRepo.isParticipant(me, roomId);
    if (!isParticipant) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    if (dto.type === 'TEXT' && !dto.text?.trim()) {
      throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
        message: '텍스트 메시지는 내용이 필요합니다.',
      });
    }

    if (dto.type !== 'TEXT' && !dto.mediaUrl) {
      throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
        message: '미디어 메시지는 mediaUrl이 필요합니다.',
      });
    }

    if (dto.type === 'AUDIO' && !dto.durationSec) {
      throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
        message: '오디오 메시지는 durationSec이 필요합니다.',
      });
    }

    const message = await this.messageRepo.createMessage(
      roomId,
      me,
      peerUserId,
      dto.type,
      dto.type === 'TEXT' ? (dto.text ?? null) : null,
      dto.type !== 'TEXT' ? (dto.mediaUrl ?? null) : null,
    );

    return {
      messageId: Number(message.id),
      sentAt: message.sentAt.toISOString(),
    };
  }

  async markAsRead(meUserId: number, messageId: number): Promise<void> {
    const me = BigInt(meUserId);
    const msgId = BigInt(messageId);

    const message = await this.messageRepo.findMessageById(msgId);
    if (!message || message.deletedAt) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '메시지를 찾을 수 없습니다.',
      });
    }

    // 메시지 수신자인지 확인
    if (message.sentToId !== me) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    // 추가: 채팅방 참여자인지 확인
    const isParticipant = await this.participantRepo.isParticipant(
      me,
      message.roomId,
    );
    if (!isParticipant) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    await this.messageRepo.markAsRead(msgId, me);
  }

  async deleteMessage(meUserId: number, messageId: number): Promise<void> {
    const me = BigInt(meUserId);
    const msgId = BigInt(messageId);

    const message = await this.messageRepo.findMessageById(msgId);
    if (!message || message.deletedAt) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '메시지를 찾을 수 없습니다.',
      });
    }

    // 메시지 송신자 또는 수신자인지 확인
    if (message.sentById !== me && message.sentToId !== me) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    // 추가: 채팅방 참여자인지 확인
    const isParticipant = await this.participantRepo.isParticipant(
      me,
      message.roomId,
    );
    if (!isParticipant) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    await this.messageRepo.deleteMessage(msgId, me);
  }
}
