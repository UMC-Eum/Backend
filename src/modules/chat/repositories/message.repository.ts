import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export type LastMessageSummary = {
  sentAt: Date;
  type: string | null;
  text: string | null;
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
}
