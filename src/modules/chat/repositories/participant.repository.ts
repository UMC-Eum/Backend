import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRoomIds(me: bigint): Promise<bigint[]> {
    const parts = await this.prisma.chatParticipant.findMany({
      where: { userId: me, endedAt: null },
      select: { roomId: true },
    });

    return parts.map((p) => p.roomId);
  }

  async isParticipant(me: bigint, roomId: bigint): Promise<boolean> {
    const found = await this.prisma.chatParticipant.findFirst({
      where: { userId: me, roomId, endedAt: null },
      select: { id: true },
    });

    return found !== null;
  }

  async findPeerUserId(roomId: bigint, me: bigint): Promise<bigint | null> {
    const peer = await this.prisma.chatParticipant.findFirst({
      where: { roomId, userId: { not: me }, endedAt: null },
      select: { userId: true },
    });

    return peer?.userId ?? null;
  }

  async findPeerUserIdsByRoomIds(
    roomIds: bigint[],
    me: bigint,
  ): Promise<Map<bigint, bigint>> {
    const rows = await this.prisma.chatParticipant.findMany({
      where: { roomId: { in: roomIds }, userId: { not: me }, endedAt: null },
      select: { roomId: true, userId: true },
    });

    const map = new Map<bigint, bigint>();
    for (const r of rows) map.set(r.roomId, r.userId);

    return map;
  }
}
