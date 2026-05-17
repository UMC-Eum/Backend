import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { ChatMediaType, Prisma } from '@prisma/client';

export type LastMessageSummary = {
  sentAt: Date;
  type: ChatMediaType | null;
  text: string | null;
};

// 옛 schema의 sentById/sentToId/roomId는 ChatMessage에서 사라지고 participantId 하나로 통합됨.
// service 레이어 호환을 위해 repository에서 participant join 결과를 평탄화해 옛 shape으로 반환.
export type MessageWithMedia = {
  id: bigint;
  sentAt: Date;
  readAt: Date | null;
  sentById: bigint;
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
};

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO(chat-participant): 옛 sentToId: me 의미는 "내가 받은 메시지". 새 구조에선 "방의 다른 참여자가 보낸 메시지"로
  // 풀어냄 (participant.userId !== me). 1:1 채팅에선 동치이나 그룹 채팅 도입 시 의미 재검토 필요.
  async countUnreadByRoomIds(
    roomIds: bigint[],
    me: bigint,
    minSentAtByRoom: Map<bigint, Date> | null = null,
  ): Promise<Map<bigint, number>> {
    if (roomIds.length === 0) return new Map<bigint, number>();

    const where: Prisma.ChatMessageWhereInput = {
      participant: { roomId: { in: roomIds }, userId: { not: me } },
      readAt: null,
      deletedAt: null,
    };

    if (minSentAtByRoom) {
      where.OR = roomIds.map((roomId) => {
        const minSentAt = minSentAtByRoom.get(roomId);
        if (!minSentAt) return { participant: { roomId } };

        return {
          participant: { roomId },
          sentAt: { gte: minSentAt },
        };
      });
    }

    // TODO(perf): groupBy를 직접 관계 필드로 못 해서 findMany + 후처리.
    // 메시지 개수가 많아지면 raw SQL ($queryRaw)로 최적화 검토.
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

    // TODO(perf): findMany + 후처리로 처리 (groupBy의 by에 관계 필드 직접 못 줌).
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
        participant: { select: { userId: true } },
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

    // TODO(schema-nullable): participant.userId가 nullable (탈퇴 유저). 옛 shape의 sentById는 bigint NOT NULL이라
    // 임시로 0n으로 fallback. UI에서 "삭제된 사용자" 메시지 처리 도입 시 옵셔널 타입으로 변경 필요.
    return rows.map((r) => ({
      id: r.id,
      sentAt: r.sentAt,
      readAt: r.readAt,
      sentById: r.participant.userId ?? 0n,
      chatMedia: r.chatMedia,
    }));
  }

  // TODO(chat-participant): createMessage 흐름 변경 — 옛 (roomId, sentById, sentToId)를 받아 메시지에 직접 저장하던
  // 방식 → 새 구조는 participantId 하나만 저장. (roomId, sentById=me)로 participant를 lookup하여 participantId를 얻고
  // ChatMessage.create에는 participantId만 전달. peerUserId는 더 이상 메시지에 직접 저장 안 됨 (room의 다른 participant로 추론).
  async createMessage(
    roomId: bigint,
    me: bigint,
    _peerUserId: bigint, // TODO(chat-participant): 더 이상 사용 안 함. signature 정리는 follow-up PR
    type: ChatMediaType,
    text: string | null,
    storedMediaRef: string | null,
    durationSec: number | null,
  ) {
    void _peerUserId;
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

  // TODO(business): findMessageById는 me 인자가 없어서 sentToId를 정확히 산정할 수 없음.
  // 1:1 채팅 가정 하에 "같은 방의 다른 participant.userId"로 추론. 그룹 채팅 도입 시 me 인자 추가 + 다중 수신자 모델 재설계 필요.
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

    // TODO(schema-nullable): participant/peer userId가 nullable (탈퇴 유저). 옛 shape은 bigint NOT NULL이라 0n fallback.
    return {
      id: m.id,
      sentAt: m.sentAt,
      readAt: m.readAt,
      deletedAt: m.deletedAt,
      sentById: senderId ?? 0n,
      sentToId: peer ?? 0n,
      roomId: m.participant.roomId,
    };
  }

  // TODO(business): 옛 sentToId: me 조건 = "내가 받은 메시지를 읽음으로 표시". 새 구조에선
  // "발신자가 me가 아닌 메시지"로 풀어냄. service 레이어에서 isParticipant 가드로 방 검증을 이미 하므로 안전.
  async markAsRead(messageId: bigint, me: bigint, readAt: Date) {
    const updated = await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        participant: { userId: { not: me } },
        readAt: null,
        deletedAt: null,
      },
      data: { readAt },
    });

    return updated.count > 0;
  }

  // TODO(business): 옛 OR: [{sentById: me}, {sentToId: me}] = "발신자/수신자 둘 다 삭제 가능".
  // 새 구조에선 본인이 보낸 메시지만 삭제 가능으로 단순화. 수신자도 삭제 가능하게 할지 정책 결정 필요.
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
