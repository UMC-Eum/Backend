import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const ADDRESS_SELECT = {
  emdName: true,
  sigunguName: true,
  sidoName: true,
  fullName: true,
} as const;

const USER_BASIC_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
} as const;

const USER_DETAIL_SELECT = {
  ...USER_BASIC_SELECT,
  birthdate: true,
  age: true,
  address: {
    select: ADDRESS_SELECT,
  },
} as const;

const USER_BASIC_WITH_ADDRESS_SELECT = {
  ...USER_BASIC_SELECT,
  address: {
    select: ADDRESS_SELECT,
  },
} as const;

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPeerUserBasic(target: bigint) {
    return this.prisma.user.findUnique({
      where: { id: target },
      select: USER_BASIC_SELECT,
    });
  }

  async findRoomIdByMeAndTarget(
    me: bigint,
    target: bigint,
  ): Promise<bigint | null> {
    const myParticipants = await this.prisma.chatParticipant.findMany({
      where: { userId: me, endedAt: null },
      select: { roomId: true },
    });

    const roomIds = myParticipants.map((p) => p.roomId);
    if (roomIds.length === 0) return null;

    const existing = await this.prisma.chatParticipant.findFirst({
      where: {
        roomId: { in: roomIds },
        userId: target,
        endedAt: null,
      },
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

  getRoomsByIds(roomIds: bigint[]) {
    return this.prisma.chatRoom.findMany({
      where: { id: { in: roomIds }, endedAt: null, status: 'ACTIVE' },
      select: { id: true, startedAt: true },
    });
  }

  getPeerDetail(peerUserId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: peerUserId },
      select: USER_DETAIL_SELECT,
    });
  }

  // 다른 코드에서 아직 호출 중이면 유지. (가능하면 User.address 관계로 대체 추천)
  getAddressByCode(code: string) {
    return this.prisma.address.findUnique({
      where: { code },
      select: ADDRESS_SELECT,
    });
  }

  getPeerBasicsByIds(peerIds: bigint[]) {
    return this.prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: USER_BASIC_WITH_ADDRESS_SELECT,
    });
  }
}
