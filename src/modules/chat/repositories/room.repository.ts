import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPeerUserBasic(target: bigint) {
    return this.prisma.user.findUnique({
      where: { id: target },
      select: { id: true, nickname: true, profileImageUrl: true },
    });
  }

  async findRoomIdByMeAndTarget(
    me: bigint,
    target: bigint,
  ): Promise<bigint | null> {
    const myRoomIds = await this.prisma.chatParticipant.findMany({
      where: { userId: me, endedAt: null },
      select: { roomId: true },
    });

    const ids = myRoomIds.map((x) => x.roomId);
    if (ids.length === 0) return null;

    const existing = await this.prisma.chatParticipant.findFirst({
      where: { roomId: { in: ids }, userId: target, endedAt: null },
      select: { roomId: true },
    });

    return existing?.roomId ?? null;
  }

  async createRoomWithParticipants(
    me: bigint,
    target: bigint,
  ): Promise<bigint> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: {
          userId: me,
          startedAt: now,
          endedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      await tx.chatParticipant.createMany({
        data: [
          { roomId: room.id, userId: me, joinedAt: now, endedAt: null },
          { roomId: room.id, userId: target, joinedAt: now, endedAt: null },
        ],
      });

      return room.id;
    });
  }

  async getRoomsByIds(roomIds: bigint[]) {
    return this.prisma.chatRoom.findMany({
      where: { id: { in: roomIds }, endedAt: null, status: 'ACTIVE' },
      select: { id: true, startedAt: true },
    });
  }

  async getPeerDetail(peerUserId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: peerUserId },
      select: {
        id: true,
        nickname: true,
        birthdate: true,
        code: true,
        profileImageUrl: true,
      },
    });
  }

  async getAddressByCode(code: string) {
    return this.prisma.address.findUnique({
      where: { code },
      select: {
        emdName: true,
        sigunguName: true,
        sidoName: true,
        fullName: true,
      },
    });
  }

  async getPeerBasicsByIds(peerIds: bigint[]) {
    return this.prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: { id: true, nickname: true, profileImageUrl: true, code: true },
    });
  }
}
