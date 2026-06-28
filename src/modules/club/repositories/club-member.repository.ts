import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ClubMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByClubAndUser(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });
  }

  findPendingRequests(clubId: bigint) {
    return this.prisma.clubUser.findMany({
      where: {
        clubId,
        status: ClubUserStatus.PENDING,
      },
      include: {
        user: {
          select: {
            nickname: true,
            profileImageUrl: true,
            age: true,
            sex: true,
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  findActiveMembers(clubId: bigint) {
    return this.prisma.clubUser.findMany({
      where: {
        clubId,
        status: ClubUserStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            nickname: true,
            profileImageUrl: true,
            age: true,
            sex: true,
          },
        },
      },
      orderBy: [{ authority: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  createRequest({
    clubId,
    userId,
    message,
  }: {
    clubId: bigint;
    userId: bigint;
    message: string;
  }) {
    return this.prisma.clubUser.create({
      data: {
        clubId,
        userId,
        authority: ClubAuthority.GENERAL,
        status: ClubUserStatus.PENDING,
        joinMessage: message,
        requestedAt: new Date(),
        joinedAt: null,
        leftAt: null,
      },
    });
  }

  resubmitRequest({
    clubId,
    userId,
    message,
  }: {
    clubId: bigint;
    userId: bigint;
    message: string;
  }) {
    return this.prisma.clubUser.update({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      data: {
        authority: ClubAuthority.GENERAL,
        status: ClubUserStatus.PENDING,
        joinMessage: message,
        requestedAt: new Date(),
        joinedAt: null,
        leftAt: null,
      },
    });
  }

  processPendingStatusWithCapacity({
    clubId,
    userId,
    status,
    capacity,
  }: {
    clubId: bigint;
    userId: bigint;
    status: ClubUserStatus;
    capacity: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Club"
        WHERE "id" = ${clubId}
        FOR UPDATE
      `;

      const pending = await tx.clubUser.findFirst({
        where: {
          clubId,
          userId,
          status: ClubUserStatus.PENDING,
        },
      });
      if (!pending) {
        return { result: 'not_found' as const };
      }

      if (status === ClubUserStatus.ACTIVE) {
        const activeMemberCount = await tx.clubUser.count({
          where: {
            clubId,
            status: ClubUserStatus.ACTIVE,
          },
        });
        if (activeMemberCount >= capacity) {
          return { result: 'capacity_exceeded' as const };
        }
      }

      const updated = await tx.clubUser.update({
        where: { id: pending.id },
        data: {
          status,
          joinedAt: status === ClubUserStatus.ACTIVE ? new Date() : null,
        },
      });

      return { result: 'updated' as const, member: updated };
    });
  }

  leave(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.update({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      data: {
        status: ClubUserStatus.LEFT,
        authority: ClubAuthority.GENERAL,
        leftAt: new Date(),
      },
    });
  }

  kick(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.update({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      data: {
        status: ClubUserStatus.KICKED,
        authority: ClubAuthority.GENERAL,
        leftAt: new Date(),
      },
    });
  }

  delegateHost({
    clubId,
    currentHostUserId,
    nextHostUserId,
  }: {
    clubId: bigint;
    currentHostUserId: bigint;
    nextHostUserId: bigint;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.clubUser.update({
        where: {
          userId_clubId: {
            userId: currentHostUserId,
            clubId,
          },
        },
        data: { authority: ClubAuthority.GENERAL },
      });

      const nextHost = await tx.clubUser.update({
        where: {
          userId_clubId: {
            userId: nextHostUserId,
            clubId,
          },
        },
        data: { authority: ClubAuthority.HOST },
      });

      await tx.club.update({
        where: { id: clubId },
        data: { hostId: nextHostUserId },
      });

      return nextHost;
    });
  }
}
