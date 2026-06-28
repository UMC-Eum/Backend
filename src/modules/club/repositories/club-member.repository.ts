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

  updatePendingStatus({
    clubId,
    userId,
    status,
  }: {
    clubId: bigint;
    userId: bigint;
    status: ClubUserStatus;
  }) {
    return this.prisma.clubUser.updateMany({
      where: {
        clubId,
        userId,
        status: ClubUserStatus.PENDING,
      },
      data: {
        status,
        joinedAt: status === ClubUserStatus.ACTIVE ? new Date() : null,
      },
    });
  }
}
