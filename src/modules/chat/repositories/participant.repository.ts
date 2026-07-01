import { Injectable } from '@nestjs/common';
import { ActiveStatus, ClubAuthority } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isBlockedBetweenUsers(a: bigint, b: bigint): Promise<boolean> {
    const found = await this.prisma.block.findFirst({
      where: {
        deletedAt: null,
        status: 'BLOCKED',
        OR: [
          { blockedById: a, blockedId: b },
          { blockedById: b, blockedId: a },
        ],
      },
      select: { id: true },
    });

    return found !== null;
  }

  async getMyActiveParticipation(
    me: bigint,
    roomId: bigint,
  ): Promise<{ joinedAt: Date } | null> {
    return this.prisma.chatParticipant.findFirst({
      where: { userId: me, roomId, endedAt: null },
      select: { joinedAt: true },
    });
  }

  async getMyJoinedAtByRoomIds(
    me: bigint,
    roomIds: bigint[],
  ): Promise<Map<bigint, Date>> {
    const rows = await this.prisma.chatParticipant.findMany({
      where: { userId: me, roomId: { in: roomIds }, endedAt: null },
      select: { roomId: true, joinedAt: true },
    });

    const map = new Map<bigint, Date>();
    for (const r of rows) map.set(r.roomId, r.joinedAt);

    return map;
  }

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
    // userId가 null인 row(hard delete)는 peer로 매핑 불가하니 skip. soft-delete 탈퇴 유저는 userId가 유지된다.
    for (const r of rows) {
      if (r.userId !== null) map.set(r.roomId, r.userId);
    }

    return map;
  }

  // 읽음 커서 계산용: 내 active participant의 joinedAt + lastReadAt (방별).
  async getMyReadStateByRoomIds(
    me: bigint,
    roomIds: bigint[],
  ): Promise<Map<bigint, { joinedAt: Date; lastReadAt: Date | null }>> {
    if (roomIds.length === 0) return new Map();

    const rows = await this.prisma.chatParticipant.findMany({
      where: { userId: me, roomId: { in: roomIds }, endedAt: null },
      select: { roomId: true, joinedAt: true, lastReadAt: true },
    });

    const map = new Map<bigint, { joinedAt: Date; lastReadAt: Date | null }>();
    for (const r of rows) {
      map.set(r.roomId, { joinedAt: r.joinedAt, lastReadAt: r.lastReadAt });
    }

    return map;
  }

  // 방 단위 읽음 처리: 내 active participant의 lastReadAt을 단조 증가로 세팅.
  async markRoomRead(
    roomId: bigint,
    me: bigint,
    readAt: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.chatParticipant.updateMany({
      where: {
        roomId,
        userId: me,
        endedAt: null,
        OR: [{ lastReadAt: null }, { lastReadAt: { lt: readAt } }],
      },
      data: { lastReadAt: readAt },
    });

    return updated.count > 0;
  }

  // 클럽방 lazy 입장: participant upsert. created=true는 최초 생성(=입장 SYSTEM 대상).
  // 재입장(endedAt 있던 row)은 joinedAt/lastReadAt을 now로 리셋, 이미 활성 row는 role만 갱신.
  async ensureClubParticipant(
    roomId: bigint,
    me: bigint,
    role: ClubAuthority,
    now: Date,
  ): Promise<{
    participantId: bigint;
    created: boolean;
    nickname: string | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.chatParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: me } },
        select: { id: true, endedAt: true },
      });

      if (existing) {
        const updated = await tx.chatParticipant.update({
          where: { id: existing.id },
          data: {
            endedAt: null,
            role,
            ...(existing.endedAt ? { joinedAt: now, lastReadAt: now } : {}),
          },
          select: { id: true },
        });
        return { participantId: updated.id, created: false, nickname: null };
      }

      const created = await tx.chatParticipant.create({
        data: { roomId, userId: me, role, joinedAt: now, lastReadAt: now },
        select: { id: true },
      });
      // 입장 SYSTEM 메시지 문구에 쓸 닉네임 (최초 입장 시에만 필요)
      const user = await tx.user.findUnique({
        where: { id: me },
        select: { nickname: true },
      });
      return {
        participantId: created.id,
        created: true,
        nickname: user?.nickname ?? null,
      };
    });
  }

  // 퇴장 SYSTEM 메시지용: 내 참여자 id + 닉네임.
  async getMyParticipantBrief(
    roomId: bigint,
    me: bigint,
  ): Promise<{ participantId: bigint; nickname: string | null } | null> {
    const row = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: me } },
      select: { id: true, user: { select: { nickname: true } } },
    });
    if (!row) return null;
    return { participantId: row.id, nickname: row.user?.nickname ?? null };
  }

  async countActiveParticipants(roomId: bigint): Promise<number> {
    return this.prisma.chatParticipant.count({
      where: { roomId, endedAt: null },
    });
  }

  // 소켓 fan-out 대상: 활성 참여자 userId (선택적으로 발신자 제외).
  async getActiveParticipantUserIds(
    roomId: bigint,
    excludeUserId?: bigint,
  ): Promise<bigint[]> {
    const rows = await this.prisma.chatParticipant.findMany({
      where: { roomId, endedAt: null },
      select: { userId: true },
    });

    return rows
      .map((r) => r.userId)
      .filter(
        (id): id is bigint =>
          id != null && (excludeUserId == null || id !== excludeUserId),
      );
  }

  async countActiveByRoomIds(roomIds: bigint[]): Promise<Map<bigint, number>> {
    if (roomIds.length === 0) return new Map();

    const grouped = await this.prisma.chatParticipant.groupBy({
      by: ['roomId'],
      where: { roomId: { in: roomIds }, endedAt: null },
      _count: { _all: true },
    });

    const map = new Map<bigint, number>();
    for (const g of grouped) map.set(g.roomId, g._count._all);
    return map;
  }

  // 그룹 멤버 목록 + 읽음 집계용: 활성 참여자의 신원/role/읽음 커서.
  async getActiveParticipantsWithUser(roomId: bigint): Promise<
    Array<{
      userId: bigint | null;
      nickname: string | null;
      profileImageUrl: string | null;
      status: ActiveStatus | null;
      role: ClubAuthority;
      lastReadAt: Date | null;
    }>
  > {
    const rows = await this.prisma.chatParticipant.findMany({
      where: { roomId, endedAt: null },
      orderBy: { joinedAt: 'asc' },
      select: {
        userId: true,
        role: true,
        lastReadAt: true,
        user: {
          select: { nickname: true, profileImageUrl: true, status: true },
        },
      },
    });

    return rows.map((r) => ({
      userId: r.userId,
      nickname: r.user?.nickname ?? null,
      profileImageUrl: r.user?.profileImageUrl ?? null,
      status: r.user?.status ?? null,
      role: r.role,
      lastReadAt: r.lastReadAt,
    }));
  }

  // 1:1 unsend/읽음 표시용: 상대 참여자의 읽음 커서.
  async findPeerReadState(
    roomId: bigint,
    me: bigint,
  ): Promise<{ userId: bigint | null; lastReadAt: Date | null } | null> {
    const peer = await this.prisma.chatParticipant.findFirst({
      where: { roomId, userId: { not: me }, endedAt: null },
      select: { userId: true, lastReadAt: true },
    });

    return peer ?? null;
  }
}
