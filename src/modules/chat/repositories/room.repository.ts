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
  status: true,
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
        room: { type: 'DIRECT' },
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
        type: 'DIRECT',
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

  async reactivateRoomForUser(roomId: bigint, userId: bigint): Promise<bigint> {
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

      // 재입장 시 읽음 커서를 now로 리셋 → joinedAt 이전 백로그는 unread로 잡히지 않음.
      await tx.chatParticipant.upsert({
        where: { roomId_userId: { roomId, userId } },
        update: {
          joinedAt: now,
          endedAt: null,
          lastReadAt: now,
        },
        create: {
          roomId,
          userId,
          joinedAt: now,
          endedAt: null,
          lastReadAt: now,
        },
      });

      return roomId;
    });
  }

  async leaveRoom(roomId: bigint, userId: bigint): Promise<boolean> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.chatParticipant.updateMany({
        where: { roomId, userId, endedAt: null },
        data: { endedAt: now },
      });

      if (updated.count === 0) return false;

      const activeCount = await tx.chatParticipant.count({
        where: { roomId, endedAt: null },
      });

      if (activeCount === 0) {
        await tx.chatRoom.update({
          where: { id: roomId },
          data: {
            status: 'INACTIVE',
            endedAt: now,
          },
          select: { id: true },
        });
      }

      return true;
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

  // 클럽 채팅방 find-or-create (클럽당 1방, @@unique([clubId]))로 동시 생성 race 방지).
  async ensureClubRoom(clubId: bigint, hostId: bigint | null): Promise<bigint> {
    const existing = await this.prisma.chatRoom.findFirst({
      where: { clubId, type: 'CLUB' },
      select: { id: true },
    });
    if (existing) return existing.id;

    try {
      const room = await this.prisma.chatRoom.create({
        data: { clubId, type: 'CLUB', userId: hostId, status: 'ACTIVE' },
        select: { id: true },
      });
      return room.id;
    } catch {
      // unique(clubId) 충돌 = 동시 첫 입장 → 재조회
      const room = await this.prisma.chatRoom.findFirstOrThrow({
        where: { clubId, type: 'CLUB' },
        select: { id: true },
      });
      return room.id;
    }
  }

  getRoomsByIds(roomIds: bigint[]) {
    return this.prisma.chatRoom.findMany({
      where: { id: { in: roomIds }, endedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        startedAt: true,
        type: true,
        clubId: true,
      },
    });
  }

  // 단일 방의 타입/클럽 정보 (DIRECT/CLUB 분기용).
  async getRoomTypeInfo(roomId: bigint): Promise<{
    type: 'DIRECT' | 'CLUB';
    clubId: bigint | null;
  } | null> {
    return this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { type: true, clubId: true },
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
