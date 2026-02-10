import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { ChatMediaType } from '@prisma/client';

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
      const sentAt = g._max.sentAt;
      if (sentAt) map.set(g.roomId, sentAt);
    }

    return map;
  }

  async getLastMessageSummary(
    roomId: bigint,
  ): Promise<LastMessageSummary | null> {
    const lastMsg = await this.prisma.chatMessage.findFirst({
      where: { roomId, deletedAt: null },
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
    cursorSentAt: Date | null,
    cursorMessageId: bigint | null,
    size: number,
  ): Promise<MessageWithMedia[]> {
    const where: {
      roomId: bigint;
      deletedAt: null;
      OR?: Array<
        { sentAt: { lt: Date } } | { sentAt: Date; id: { lt: bigint } }
      >;
    } = {
      roomId,
      deletedAt: null,
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
    sentById: bigint,
    sentToId: bigint,
    type: ChatMediaType,
    text: string | null,
    mediaUrl: string | null,
    durationSec: number | null = null,
  ): Promise<{ id: bigint; sentAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          roomId,
          sentById,
          sentToId,
          sentAt: new Date(),
        },
        select: { id: true, sentAt: true },
      });

      await tx.chatMedia.create({
        data: {
          messageId: message.id,
          type,
          text: type === 'TEXT' ? text : null,
          url: type !== 'TEXT' ? mediaUrl : null,
          durationSec: type === 'AUDIO' ? durationSec : null,
        },
      });

      return message;
    });
  }

  async markAsRead(
    messageId: bigint,
    userId: bigint,
    readAt: Date = new Date(),
  ): Promise<boolean> {
    const updated = await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        sentToId: userId,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt,
      },
    });

    return updated.count > 0;
  }

  async deleteMessage(
    messageId: bigint,
    userId: bigint,
    deletedAt: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        OR: [{ sentById: userId }, { sentToId: userId }],
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    return updated.count > 0;
  }

  async findMessageById(messageId: bigint) {
    return this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        sentById: true,
        sentToId: true,
        deletedAt: true,
      },
    });
  }
}
