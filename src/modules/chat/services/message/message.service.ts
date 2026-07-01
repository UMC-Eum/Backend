import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { decodeCursor, encodeCursor } from '../../utils/cursor.util';
import { normalizeIdentity } from '../../utils/withdrawn.util';
import { ChatGateway } from '../../gateways/chat.gateway';
import { ChatMediaService } from '../chat-media/chat-media.service';

import type {
  ListMessagesQueryDto,
  ListMessagesRes,
  MessageItem,
  SendMessageDto,
  SendMessageRes,
} from '../../dtos/message.dto';
import type { MessageWithMedia } from '../../repositories/message.repository';
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
    private readonly clubRepo: ClubRepository,
    private readonly chatGateway: ChatGateway,
    private readonly chatMediaService: ChatMediaService,
  ) {}

  async listMessages(
    meUserId: number,
    chatRoomId: number,
    query: ListMessagesQueryDto,
  ): Promise<ListMessagesRes> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const myPart = await this.participantRepo.getMyActiveParticipation(
      me,
      roomId,
    );
    if (!myPart) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    if (!roomInfo) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const size = query.size ?? 30;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorSentAt = cursor ? new Date(cursor.sortAt) : null;
    const cursorMessageId =
      cursor && 'messageId' in cursor ? BigInt(cursor.messageId) : null;

    const messages = await this.messageRepo.findMessagesByRoomId(
      roomId,
      myPart.joinedAt,
      cursorSentAt,
      cursorMessageId,
      size,
    );

    const hasNext = messages.length > size;
    const page = hasNext ? messages.slice(0, size) : messages;

    const nextCursor =
      hasNext && page.length > 0
        ? encodeCursor({
            sortAt: page[page.length - 1].sentAt.toISOString(),
            messageId: page[page.length - 1].id.toString(),
          })
        : null;

    if (roomInfo.type === 'CLUB') {
      return this.buildClubListMessages(
        chatRoomId,
        roomId,
        me,
        roomInfo.clubId,
        page,
        nextCursor,
      );
    }

    return this.buildDirectListMessages(
      chatRoomId,
      roomId,
      me,
      page,
      nextCursor,
    );
  }

  private async buildDirectListMessages(
    chatRoomId: number,
    roomId: bigint,
    me: bigint,
    page: MessageWithMedia[],
    nextCursor: string | null,
  ): Promise<ListMessagesRes> {
    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    // peerUserId가 null이면 상대가 hard delete된 경우 → 탈퇴 placeholder peer로 렌더
    const peerDetail = peerUserId
      ? await this.roomRepo.getPeerDetail(peerUserId)
      : null;

    const areaName =
      peerDetail?.address?.emdName ??
      peerDetail?.address?.sigunguName ??
      peerDetail?.address?.sidoName ??
      peerDetail?.address?.fullName ??
      null;

    const peerIdentity = normalizeIdentity(
      peerDetail?.status ?? null,
      peerDetail?.nickname ?? null,
      peerDetail?.profileImageUrl ?? null,
    );

    // 읽음 표시는 상대 참여자의 읽음 커서로 파생: 내가 보낸 메시지를 상대가 읽었는지.
    const peerRead = await this.participantRepo.findPeerReadState(roomId, me);
    const peerCursor = peerRead?.lastReadAt ?? null;

    const items: MessageItem[] = await Promise.all(
      page.map(async (msg) => {
        const media = msg.chatMedia[0] ?? null;
        const isSystem = (media?.type ?? 'TEXT') === 'SYSTEM';
        const isMine = !isSystem && msg.sentById === me;
        const mediaUrl = await this.chatMediaService.toClientUrl(
          media?.url ?? null,
        );
        const readAt =
          isMine && peerCursor && peerCursor >= msg.sentAt
            ? peerCursor.toISOString()
            : null;

        return {
          messageId: Number(msg.id),
          type: media?.type ?? 'TEXT',
          text: media?.text ?? null,
          mediaUrl,
          durationSec: media?.durationSec ?? null,
          senderUserId: Number(msg.sentById),
          sentAt: msg.sentAt.toISOString(),
          readAt,
          isMine,
          isSystem,
        };
      }),
    );

    return {
      chatRoomId,
      type: 'DIRECT',
      peer: {
        userId: peerDetail ? Number(peerDetail.id) : 0,
        nickname: peerIdentity.nickname,
        age: peerDetail ? calcAge(peerDetail.birthdate) : 0,
        areaName,
        isWithdrawn: peerIdentity.isWithdrawn,
      },
      items,
      nextCursor,
    };
  }

  private async buildClubListMessages(
    chatRoomId: number,
    roomId: bigint,
    me: bigint,
    clubId: bigint | null,
    page: MessageWithMedia[],
    nextCursor: string | null,
  ): Promise<ListMessagesRes> {
    if (clubId == null) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const club = await this.clubRepo.findClubBasic(clubId);
    if (!club) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    // 멤버십이 회수(kick/leave)됐을 수 있으니 재검증
    const member = await this.clubRepo.findActiveClubUser(me, clubId);
    if (!member) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    // 읽음 인원수 집계용 활성 참여자 커서
    const members =
      await this.participantRepo.getActiveParticipantsWithUser(roomId);

    const items: MessageItem[] = await Promise.all(
      page.map(async (msg) => {
        const media = msg.chatMedia[0] ?? null;
        const isSystem = (media?.type ?? 'TEXT') === 'SYSTEM';
        const isMine = !isSystem && msg.sentById === me;
        const mediaUrl = await this.chatMediaService.toClientUrl(
          media?.url ?? null,
        );
        const senderIdentity = normalizeIdentity(
          msg.senderStatus,
          msg.senderNickname,
          msg.senderProfileImageUrl,
        );
        // 읽은 인원수(발신자 제외) = lastReadAt >= sentAt 인 다른 활성 참여자 수
        const readCount = members.filter(
          (p) =>
            p.userId !== msg.sentById &&
            p.lastReadAt != null &&
            p.lastReadAt >= msg.sentAt,
        ).length;

        return {
          messageId: Number(msg.id),
          type: media?.type ?? 'TEXT',
          text: media?.text ?? null,
          mediaUrl,
          durationSec: media?.durationSec ?? null,
          senderUserId: Number(msg.sentById),
          sentAt: msg.sentAt.toISOString(),
          readAt: null,
          isMine,
          isSystem,
          // SYSTEM 메시지는 발신자 신원 노출 불필요
          sender: isSystem
            ? null
            : {
                userId: Number(msg.sentById),
                nickname: senderIdentity.nickname,
                profileImageUrl: senderIdentity.profileImageUrl,
                isWithdrawn: senderIdentity.isWithdrawn,
              },
          readCount,
        };
      }),
    );

    return {
      chatRoomId,
      type: 'CLUB',
      club: {
        clubId: Number(club.id),
        name: club.name,
        thumbnailUrl: club.thumbnailUrl,
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

    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    if (!roomInfo) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    if (roomInfo.type === 'CLUB') {
      // 그룹: 차단 검사 없음. ClubUser ACTIVE 멤버십만 재검증.
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
    } else {
      // DIRECT: 상대 차단 검사
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

    if ((dto.type === 'AUDIO' || dto.type === 'VIDEO') && !dto.durationSec) {
      throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
        message: '오디오/비디오 메시지는 durationSec이 필요합니다.',
      });
    }

    const storedMediaRef =
      dto.type !== 'TEXT' && dto.mediaUrl
        ? this.chatMediaService.normalizeChatMediaRef(chatRoomId, dto.mediaUrl)
        : null;

    const message = await this.messageRepo.createMessage(
      roomId,
      me,
      dto.type,
      dto.type === 'TEXT' ? (dto.text ?? null) : null,
      dto.type !== 'TEXT' ? storedMediaRef : null,
      dto.type === 'AUDIO' || dto.type === 'VIDEO'
        ? (dto.durationSec ?? null)
        : null,
    );

    return {
      messageId: Number(message.id),
      sentAt: message.sentAt.toISOString(),
    };
  }

  // 방 단위 읽음 처리: 내 읽음 커서(lastReadAt)를 now로 전진시키고 broadcast.
  async markRoomRead(
    meUserId: number,
    chatRoomId: number,
  ): Promise<{ lastReadAt: string }> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const myPart = await this.participantRepo.getMyActiveParticipation(
      me,
      roomId,
    );
    if (!myPart) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const readAt = new Date();
    await this.participantRepo.markRoomRead(roomId, me, readAt);

    // 읽음 커서 broadcast 대상: DIRECT는 나+상대, CLUB은 활성 참여자 전원.
    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    let notifyUserIds: number[];
    if (roomInfo?.type === 'CLUB') {
      const ids =
        await this.participantRepo.getActiveParticipantUserIds(roomId);
      notifyUserIds = ids.map(Number);
    } else {
      const peer = await this.participantRepo.findPeerReadState(roomId, me);
      notifyUserIds = [meUserId];
      if (peer?.userId != null) notifyUserIds.push(Number(peer.userId));
    }

    this.chatGateway.emitRoomRead({
      chatRoomId,
      readerUserId: meUserId,
      lastReadAt: readAt.toISOString(),
      notifyUserIds,
    });

    return { lastReadAt: readAt.toISOString() };
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

    // CLUB(그룹) 전송취소는 현재 미지원 — 다중 참여자 읽음 판정/삭제 fan-out 미구현으로 명시 차단.
    if (message.roomType === 'CLUB') {
      throw new AppException('CHAT_GROUP_MESSAGE_UNSEND_NOT_ALLOWED');
    }

    // 전송취소는 발신자만 가능
    if (message.sentById !== me) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const peerUserId = message.sentToId;
    const isBlocked = await this.participantRepo.isBlockedBetweenUsers(
      me,
      peerUserId,
    );
    if (isBlocked) {
      throw new AppException('CHAT_MESSAGE_BLOCKED');
    }

    // 전송취소 가능 조건: 상대가 아직 이 메시지를 읽지 않음(읽음 커서 < sentAt).
    const peer = await this.participantRepo.findPeerReadState(
      message.roomId,
      me,
    );
    if (peer?.lastReadAt && peer.lastReadAt >= message.sentAt) {
      throw new AppException('CHAT_MESSAGE_UNSEND_NOT_ALLOWED');
    }

    const deletedAt = new Date();
    const updated = await this.messageRepo.deleteMessage(msgId, me, deletedAt);
    if (!updated) {
      throw new AppException('CHAT_MESSAGE_UNSEND_NOT_ALLOWED');
    }

    const notifyUserIds = Array.from(
      new Set([Number(message.sentById), Number(message.sentToId)]),
    );

    this.chatGateway.emitMessageDeleted({
      chatRoomId: Number(message.roomId),
      messageId: Number(message.id),
      deletedByUserId: meUserId,
      deletedAt: deletedAt.toISOString(),
      notifyUserIds,
    });
  }
}
