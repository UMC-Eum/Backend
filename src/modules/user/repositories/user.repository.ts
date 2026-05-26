import { Injectable } from '@nestjs/common';
import { ActiveStatus, Sex, ClubAuthority } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findProfileById(userId: number) {
    return this.prismaService.user.findFirst({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        nickname: true,
        sex: true,
        age: true,
        introText: true,
        introVoiceUrl: true,
        profileImageUrl: true,
        address: {
          select: {
            code: true,
            fullName: true,
            sigunguName: true,
          },
        },
        interests: {
          where: { deletedAt: null },
          select: {
            interest: {
              select: {
                body: true,
              },
            },
          },
        },
        personalities: {
          where: { deletedAt: null },
          select: {
            personality: {
              select: {
                body: true,
              },
            },
          },
        },
        idealPersonalities: {
          where: { deletedAt: null },
          select: {
            personality: {
              select: {
                body: true,
              },
            },
          },
        },
      },
    });
  }

  findDetailedProfileById(userId: number) {
    return this.prismaService.user.findFirst({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        nickname: true,
        birthdate: true,
        profileImageUrl: true,
        introText: true,
        introVoiceUrl: true,
        // TODO(vibe-pgvector): vibeVector는 Unsupported("vector") 타입이라 Prisma client로 select 불가.
        // 필요 시 별도 $queryRaw helper로 조회. 현재 호출처(user.service)에서 미사용.
        address: {
          select: {
            fullName: true,
          },
        },
        interests: {
          where: { deletedAt: null },
          select: {
            interestId: true,
            interest: {
              select: {
                body: true,
              },
            },
          },
        },
        personalities: {
          where: { deletedAt: null },
          select: {
            personalityId: true,
            personality: {
              select: {
                body: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  findAddressByCode(code: string) {
    return this.prismaService.address.findUnique({
      where: { code },
      select: { code: true },
    });
  }

  findInterestsByBodies(bodies: string[]) {
    return this.prismaService.interest.findMany({
      where: { body: { in: bodies } },
      select: { id: true, body: true },
    });
  }

  findPersonalitiesByBodies(bodies: string[]) {
    return this.prismaService.personality.findMany({
      where: { body: { in: bodies } },
      select: { id: true, body: true },
    });
  }

  findAllPersonalities() {
    return this.prismaService.personality.findMany({
      select: { id: true, body: true },
    });
  }

  updateProfile(
    userId: number,
    data: {
      nickname?: string;
      sex?: Sex;
      age?: number;
      code?: string;
      introText?: string;
      introVoiceUrl?: string;
      profileImageUrl?: string;
    },
  ) {
    return this.prismaService.user.updateMany({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      data,
    });
  }

  deactivateProfile(userId: number) {
    return this.prismaService.user.updateMany({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      data: {
        status: ActiveStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });
  }

  async updateKeywords(userId: number, interestKeywordIds: number[]) {
    const now = new Date();
    const ids = interestKeywordIds.map((id) => BigInt(id));

    return this.prismaService.$transaction(async (tx) => {
      await tx.userInterest.updateMany({
        where: {
          userId: BigInt(userId),
          deletedAt: null,
          ...(ids.length > 0 ? { interestId: { notIn: ids } } : {}),
        },
        data: {
          deletedAt: now,
        },
      });

      if (ids.length > 0) {
        await tx.userInterest.updateMany({
          where: {
            userId: BigInt(userId),
            interestId: { in: ids },
          },
          data: {
            deletedAt: null,
          },
        });

        const existing = await tx.userInterest.findMany({
          where: {
            userId: BigInt(userId),
            interestId: { in: ids },
          },
          select: { interestId: true },
        });

        const existingIds = new Set(
          existing.map((item) => Number(item.interestId)),
        );
        const createData = interestKeywordIds
          .filter((id) => !existingIds.has(id))
          .map((id) => ({
            userId: BigInt(userId),
            interestId: BigInt(id),
          }));

        if (createData.length > 0) {
          await tx.userInterest.createMany({ data: createData });
        }
      }
    });
  }

  async updatePersonalities(userId: number, personalityIds: number[]) {
    const now = new Date();
    const ids = personalityIds.map((id) => BigInt(id));

    return this.prismaService.$transaction(async (tx) => {
      await tx.userPersonality.updateMany({
        where: {
          userId: BigInt(userId),
          deletedAt: null,
          ...(ids.length > 0 ? { personalityId: { notIn: ids } } : {}),
        },
        data: { deletedAt: now },
      });

      if (ids.length > 0) {
        await tx.userPersonality.updateMany({
          where: {
            userId: BigInt(userId),
            personalityId: { in: ids },
          },
          data: { deletedAt: null },
        });

        const existing = await tx.userPersonality.findMany({
          where: {
            userId: BigInt(userId),
            personalityId: { in: ids },
          },
          select: { personalityId: true },
        });

        const existingIds = new Set(
          existing.map((item) => Number(item.personalityId)),
        );
        const createData = personalityIds
          .filter((id) => !existingIds.has(id))
          .map((id) => ({
            userId: BigInt(userId),
            personalityId: BigInt(id),
          }));

        if (createData.length > 0) {
          await tx.userPersonality.createMany({ data: createData });
        }
      }
    });
  }

  async updateIdealPersonalities(userId: number, personalityIds: number[]) {
    const now = new Date();
    const ids = personalityIds.map((id) => BigInt(id));

    return this.prismaService.$transaction(async (tx) => {
      await tx.userIdealPersonality.updateMany({
        where: {
          userId: BigInt(userId),
          deletedAt: null,
          ...(ids.length > 0 ? { personalityId: { notIn: ids } } : {}),
        },
        data: { deletedAt: now },
      });

      if (ids.length > 0) {
        await tx.userIdealPersonality.updateMany({
          where: {
            userId: BigInt(userId),
            personalityId: { in: ids },
          },
          data: { deletedAt: null },
        });

        const existing = await tx.userIdealPersonality.findMany({
          where: {
            userId: BigInt(userId),
            personalityId: { in: ids },
          },
          select: { personalityId: true },
        });

        const existingIds = new Set(
          existing.map((item) => Number(item.personalityId)),
        );
        const createData = personalityIds
          .filter((id) => !existingIds.has(id))
          .map((id) => ({
            userId: BigInt(userId),
            personalityId: BigInt(id),
          }));

        if (createData.length > 0) {
          await tx.userIdealPersonality.createMany({ data: createData });
        }
      }
    });
  }

  async listMyClubs(userId: number, role: 'ALL' | 'HOST' | 'MEMBER', cursor?: bigint, limit = 20) {
    const whereRole = role === 'ALL' ? {} : role === 'HOST' ? { authority: ClubAuthority.HOST } : { authority: { not: ClubAuthority.HOST } };
    const rows = await this.prismaService.clubUser.findMany({
      where: { userId: BigInt(userId), status: 'ACTIVE', leftAt: null, ...whereRole },
      include: { club: true },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasNext ? String(items[items.length - 1]?.id ?? '') : null };
  }

  async listMyLikedClubs(userId: number, cursor?: bigint, limit = 20) {
    const rows = await this.prismaService.clubLike.findMany({
      where: { userId: BigInt(userId) },
      include: { club: true },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasNext ? String(items[items.length - 1]?.id ?? '') : null, hasMore: hasNext };
  }

  createVisit(visitedBy: number, visitedTo: number) {
    return this.prismaService.userWatchLog.create({ data: { visitedBy: BigInt(visitedBy), visitedTo: BigInt(visitedTo) } });
  }

  listVisitors(visitedTo: number, cursor?: bigint, limit = 20) {
    return this.prismaService.userWatchLog.findMany({
      where: { visitedTo: BigInt(visitedTo), ...(cursor ? { id: { lt: cursor } } : {}) },
      include: { userVisitedBy: { select: { id: true, nickname: true, profileImageUrl: true, age: true, sex: true, introText: true } } },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
  }


  findClubUserByUserAndClub(userId: number, clubId: number) {
    return this.prismaService.clubUser.findUnique({ where: { userId_clubId: { userId: BigInt(userId), clubId: BigInt(clubId) } } });
  }
}
