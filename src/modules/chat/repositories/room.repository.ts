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

  async findLatestRoomIdByUsers(
    me: bigint,
    target: bigint,
  ): Promise<bigint | null> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: me } } },
          { participants: { some: { userId: target } } },
        ],
      },
      orderBy: [{ id: 'desc' }],
      select: { id: true },
    });

    return room?.id ?? null;
  }

  async reactivateRoomWithParticipants(
    roomId: bigint,
    userIds: [bigint, bigint],
  ): Promise<bigint> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.chatRoom.update({
        where: { id: roomId },
        data: {
          status: 'ACTIVE',
          endedAt: null,
        },
        select: { id: true },
      });

      await tx.chatParticipant.updateMany({
        where: { roomId, userId: { in: userIds } },
        data: {
          joinedAt: now,
          endedAt: null,
        },
      });

      // joinedAt 이전 메시지는 숨기므로, 이전에 읽지 않은 메시지가 있더라도 unreadCount에 잡히지 않게 정리합니다.
      await tx.chatMessage.updateMany({
        where: {
          roomId,
          sentToId: { in: userIds },
          readAt: null,
          deletedAt: null,
        },
        data: { readAt: now },
      });

      return roomId;
    });
  }

  async leaveRoom(roomId: bigint): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.chatParticipant.updateMany({
        where: { roomId, endedAt: null },
        data: { endedAt: now },
      });

      await tx.chatRoom.update({
        where: { id: roomId },
        data: {
          status: 'INACTIVE',
          endedAt: now,
        },
        select: { id: true },
      });
    });
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
