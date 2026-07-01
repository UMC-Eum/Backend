import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { ActiveStatus, ChatMediaType, Prisma } from '@prisma/client';

export type LastMessageSummary = {
  sentAt: Date;
  type: ChatMediaType | null;
  text: string | null;
};

// 옛 schema의 sentById/sentToId/roomId는 ChatMessage에서 사라지고 participantId 하나로 통합됨.
// service 레이어 호환을 위해 repository에서 participant join 결과를 평탄화해 옛 shape으로 반환.
// 그룹(CLUB)에서 메시지별 발신자 신원을 그리기 위해 sender 정보도 함께 평탄화한다.
export type MessageWithMedia = {
  id: bigint;
  sentAt: Date;
  readAt: Date | null;
  sentById: bigint;
  senderNickname: string | null;
  senderProfileImageUrl: string | null;
  senderStatus: ActiveStatus | null;
  chatMedia: Array<{
    type: ChatMediaType;
    text: string | null;
    url: string | null;
    durationSec: number | null;
  }>;
};

export type MessageDetail = {
  id: bigint;
  sentAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
  sentById: bigint;
  sentToId: bigint;
  roomId: bigint;
  roomType: 'DIRECT' | 'CLUB';
};

// 유효 읽음 커서 = max(lastReadAt ?? joinedAt, joinedAt).
// 재입장(joinedAt 갱신) 후 과거 lastReadAt가 joinedAt보다 이르면 joinedAt을 기준선으로 사용.
export function effectiveReadCursor(
  rs: { joinedAt: Date; lastReadAt: Date | null } | undefined,
): Date {
  if (!rs) return new Date(0);
  if (!rs.lastReadAt) return rs.joinedAt;
  return rs.lastReadAt > rs.joinedAt ? rs.lastReadAt : rs.joinedAt;
}

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 참여자별 읽음 커서 기반 unread (DIRECT/CLUB 공통).
  // unread(나) = 발신자≠나 & 미삭제 & 비SYSTEM & sentAt > max(내 lastReadAt ?? joinedAt, joinedAt).
  async countUnreadByCursor(
    roomIds: bigint[],
    me: bigint,
    readStateByRoom: Map<bigint, { joinedAt: Date; lastReadAt: Date | null }>,
  ): Promise<Map<bigint, number>> {
    if (roomIds.length === 0) return new Map<bigint, number>();

    const where: Prisma.ChatMessageWhereInput = {
      deletedAt: null,
      participant: { userId: { not: me } },
      NOT: { chatMedia: { some: { type: 'SYSTEM' } } },
      OR: roomIds.map((roomId) => {
        const rs = readStateByRoom.get(roomId);
        const cursor = effectiveReadCursor(rs);
        return { participant: { roomId }, sentAt: { gt: cursor } };
      }),
    };

    // groupBy의 by에 관계 필드를 직접 줄 수 없어 findMany + 후처리.
    // TODO(EUM-29 후속 최적화): 메시지가 많아지면 raw SQL($queryRaw)로 전환 검토.
    const rows = await this.prisma.chatMessage.findMany({
      where,
      select: { participant: { select: { roomId: true } } },
    });

    const map = new Map<bigint, number>();
    for (const r of rows) {
      const rid = r.participant.roomId;
      map.set(rid, (map.get(rid) ?? 0) + 1);
    }

    return map;
  }

  async getLastSentAtByRoomIds(roomIds: bigint[]): Promise<Map<bigint, Date>> {
    if (roomIds.length === 0) return new Map<bigint, Date>();

    // groupBy의 by에 관계 필드를 직접 줄 수 없어 findMany + 후처리. (TODO(EUM-29 후속 최적화): raw SQL 검토)
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        participant: { roomId: { in: roomIds } },
        deletedAt: null,
      },
      select: {
        sentAt: true,
        participant: { select: { roomId: true } },
      },
    });

    const map = new Map<bigint, Date>();
    for (const r of rows) {
      const rid = r.participant.roomId;
      const existing = map.get(rid);
      if (!existing || r.sentAt > existing) map.set(rid, r.sentAt);
    }

    return map;
  }

  async getLastMessageSummary(
    roomId: bigint,
    minSentAt: Date | null = null,
  ): Promise<LastMessageSummary | null> {
    const where: Prisma.ChatMessageWhereInput = {
      participant: { roomId },
      deletedAt: null,
      ...(minSentAt ? { sentAt: { gte: minSentAt } } : {}),
    };

    const lastMsg = await this.prisma.chatMessage.findFirst({
      where,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      select: { id: true, sentAt: true },
    });

    if (!lastMsg) return null;

    const media = await this.prisma.chatMedia.findFirst({
      where: { messageId: lastMsg.id },
      select: { type: true, text: true },
    });

    return {
      sentAt: lastMsg.sentAt,
      type: media?.type ?? null,
      text: media?.text ?? null,
    };
  }

  async findMessagesByRoomId(
    roomId: bigint,
    minSentAt: Date | null,
    cursorSentAt: Date | null,
    cursorMessageId: bigint | null,
    size: number,
  ): Promise<MessageWithMedia[]> {
    const where: Prisma.ChatMessageWhereInput = {
      participant: { roomId },
      deletedAt: null,
      ...(minSentAt ? { sentAt: { gte: minSentAt } } : {}),
    };

    if (cursorSentAt && cursorMessageId) {
      where.OR = [
        { sentAt: { lt: cursorSentAt } },
        {
          sentAt: cursorSentAt,
          id: { lt: cursorMessageId },
        },
      ];
    }

    const rows = await this.prisma.chatMessage.findMany({
      where,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
      select: {
        id: true,
        sentAt: true,
        readAt: true,
        participant: {
          select: {
            userId: true,
            user: {
              select: { nickname: true, profileImageUrl: true, status: true },
            },
          },
        },
        chatMedia: {
          select: {
            type: true,
            text: true,
            url: true,
            durationSec: true,
          },
        },
      },
    });

    // participant.userId가 null인 경우(hard delete)만 0n fallback. soft-delete 탈퇴 유저는 userId가 유지되며
    // 응답 단계에서 isWithdrawn으로 '탈퇴한 사용자' 표시를 처리한다. (withdrawn.util)
    return rows.map((r) => ({
      id: r.id,
      sentAt: r.sentAt,
      readAt: r.readAt,
      sentById: r.participant.userId ?? 0n,
      senderNickname: r.participant.user?.nickname ?? null,
      senderProfileImageUrl: r.participant.user?.profileImageUrl ?? null,
      senderStatus: r.participant.user?.status ?? null,
      chatMedia: r.chatMedia,
    }));
  }

  // (roomId, me)로 발신자 participant를 lookup해 participantId를 얻고, ChatMessage에는 participantId만 저장.
  // 수신자(peer)는 메시지에 직접 저장하지 않고 room의 다른 participant로 추론한다.
  async createMessage(
    roomId: bigint,
    me: bigint,
    type: ChatMediaType,
    text: string | null,
    storedMediaRef: string | null,
    durationSec: number | null,
  ) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.chatParticipant.findUniqueOrThrow({
        where: { roomId_userId: { roomId, userId: me } },
        select: { id: true },
      });

      const msg = await tx.chatMessage.create({
        data: {
          participantId: participant.id,
          sentAt: now,
        },
        select: { id: true, sentAt: true },
      });

      await tx.chatMedia.create({
        data: {
          messageId: msg.id,
          type,
          text,
          url: storedMediaRef,
          durationSec,
        },
      });

      return msg;
    });
  }

  // me 인자가 없어 sentToId를 1:1 가정("같은 방의 다른 participant.userId")으로 추론한다.
  // TODO(EUM-29 그룹 채팅): me 인자 추가 + 다중 수신자 모델로 재설계 필요.
  async findMessageById(messageId: bigint): Promise<MessageDetail | null> {
    const m = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        sentAt: true,
        readAt: true,
        deletedAt: true,
        participant: {
          select: {
            userId: true,
            roomId: true,
            room: {
              select: {
                type: true,
                participants: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!m) return null;

    const senderId = m.participant.userId;
    // 1:1 채팅 가정: 같은 방의 participant 중 sender가 아닌 사람의 userId
    const peer =
      m.participant.room.participants.find((p) => p.userId !== senderId)
        ?.userId ?? null;

    // participant/peer userId가 null인 경우(hard delete)만 0n fallback. 탈퇴 표시는 응답 단계의 isWithdrawn에서 처리.
    return {
      id: m.id,
      sentAt: m.sentAt,
      readAt: m.readAt,
      deletedAt: m.deletedAt,
      sentById: senderId ?? 0n,
      sentToId: peer ?? 0n,
      roomId: m.participant.roomId,
      roomType: m.participant.room.type,
    };
  }

  // SYSTEM(입장/퇴장 공지) 메시지 생성. 주체(participantId)는 입장/퇴장한 본인.
  async createSystemMessage(
    participantId: bigint,
    text: string,
  ): Promise<{ id: bigint; sentAt: Date }> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: { participantId, sentAt: now },
        select: { id: true, sentAt: true },
      });
      await tx.chatMedia.create({
        data: { messageId: msg.id, type: 'SYSTEM', text },
      });
      return msg;
    });
  }

  // 전송취소: 발신자 본인의 미삭제 메시지를 soft delete.
  // "수신자가 읽었는지"는 읽음 커서로 service에서 판단(읽었으면 호출 전에 차단).
  async deleteMessage(messageId: bigint, me: bigint, deletedAt: Date) {
    const updated = await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        participant: { userId: me },
        deletedAt: null,
      },
      data: { deletedAt },
    });

    return updated.count > 0;
  }
}
