import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { ChatMediaType, Prisma } from '@prisma/client';

export type LastMessageSummary = {
  sentAt: Date;
  type: string | null;
  text: string | null;
};

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

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countUnreadByRoomIds(
    roomIds: bigint[],
    me: bigint,
  ): Promise<Map<bigint, number>> {
    const grouped = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        sentToId: me,
        readAt: null,
        deletedAt: null,
      },
      _count: { _all: true },
    });

    const map = new Map<bigint, number>();
    for (const g of grouped) map.set(g.roomId, g._count._all);

    return map;
  }

  async getLastSentAtByRoomIds(roomIds: bigint[]): Promise<Map<bigint, Date>> {
    const grouped = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: { roomId: { in: roomIds }, deletedAt: null },
      _max: { sentAt: true },
    });

    const map = new Map<bigint, Date>();
    for (const g of grouped) {
      if (g._max.sentAt) map.set(g.roomId, g._max.sentAt);
    }

    return map;
  }

  async getLastMessageSummary(
    roomId: bigint,
    minSentAt: Date | null = null,
  ): Promise<LastMessageSummary | null> {
    const where: Prisma.ChatMessageWhereInput = {
      roomId,
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
      roomId,
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

    return this.prisma.chatMessage.findMany({
      where,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
      select: {
        id: true,
        sentAt: true,
        readAt: true,
        sentById: true,
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
  }

  async createMessage(
    roomId: bigint,
    me: bigint,
    peerUserId: bigint,
    type: ChatMediaType,
    text: string | null,
    storedMediaRef: string | null,
    durationSec: number | null,
  ) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          roomId,
          sentById: me,
          sentToId: peerUserId,
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

  findMessageById(messageId: bigint) {
    return this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        sentById: true,
        sentToId: true,
        sentAt: true,
        readAt: true,
        deletedAt: true,
      },
    });
  }

  async markAsRead(messageId: bigint, me: bigint, readAt: Date) {
    const updated = await this.prisma.chatMessage.updateMany({
      where: { id: messageId, sentToId: me, readAt: null, deletedAt: null },
      data: { readAt },
    });

    return updated.count > 0;
  }

  async deleteMessage(messageId: bigint, me: bigint, deletedAt: Date) {
    const updated = await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        OR: [{ sentById: me }, { sentToId: me }],
        deletedAt: null,
      },
      data: { deletedAt },
    });

    return updated.count > 0;
  }
}
