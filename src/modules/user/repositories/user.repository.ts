import { Injectable } from '@nestjs/common';
import {
  ActiveStatus,
  AddressLevel,
  AuthProvider,
  ClubUserStatus,
  Prisma,
  Sex,
} from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async upsertKakaoUser({
    providerUserId,
    email,
    nickname,
    defaultBirthdate,
    defaultAddressCode,
    defaultIntroVoiceUrl,
    defaultProfileImageUrl,
  }: {
    providerUserId: string;
    email: string;
    nickname: string;
    defaultBirthdate: Date;
    defaultAddressCode: string;
    defaultIntroVoiceUrl: string;
    defaultProfileImageUrl: string;
  }) {
    await this.ensureDefaultAddress(defaultAddressCode);

    return this.prismaService.$transaction(async (tx) => {
      const insertedRows = await tx.$queryRaw<Array<{ id: bigint }>>(
        Prisma.sql`
          INSERT INTO "User" (
            "birthdate",
            "email",
            "nickname",
            "updatedAt",
            "introVoiceUrl",
            "introText",
            "profileImageUrl",
            "code",
            "provider",
            "providerUserId",
            "vibeVector"
          )
          VALUES (
            ${defaultBirthdate},
            ${email},
            ${nickname},
            NOW(),
            ${defaultIntroVoiceUrl},
            ${''},
            ${defaultProfileImageUrl},
            ${defaultAddressCode},
            ${AuthProvider.KAKAO}::"AuthProvider",
            ${providerUserId},
            '[0]'::vector
          )
          ON CONFLICT ("provider", "providerUserId") DO NOTHING
          RETURNING "id"
        `,
      );

      const insertedId = insertedRows[0]?.id;
      if (insertedId) {
        const createdUser = await tx.user.findUniqueOrThrow({
          where: { id: insertedId },
        });

        return { user: createdUser, isNewUser: true };
      }

      const updatedUser = await tx.user.update({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.KAKAO,
            providerUserId,
          },
        },
        data: { email },
      });

      return { user: updatedUser, isNewUser: false };
    });
  }

  countActiveReportsByUserId(userId: number) {
    return this.prismaService.userReport.count({
      where: {
        reportedUserId: BigInt(userId),
        report: { deletedAt: null },
      },
    });
  }

  markInactive(userId: number) {
    return this.prismaService.user.update({
      where: { id: BigInt(userId) },
      data: { status: ActiveStatus.INACTIVE },
    });
  }

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

  findMyActiveClubs(userId: number) {
    return this.prismaService.clubUser.findMany({
      where: {
        userId: BigInt(userId),
        status: ClubUserStatus.ACTIVE,
        club: { deletedAt: null },
      },
      select: {
        authority: true,
        joinedAt: true,
        club: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            category: true,
            introText: true,
            clubUsers: {
              where: { status: ClubUserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  findMyLikedClubs(userId: number) {
    return this.prismaService.clubLike.findMany({
      where: {
        userId: BigInt(userId),
        club: { deletedAt: null },
      },
      select: {
        createdAt: true,
        club: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            category: true,
            introText: true,
            clubUsers: {
              where: { status: ClubUserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveUserId(userId: number) {
    return this.prismaService.user.findFirst({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  createProfileVisitLog({
    visitedBy,
    visitedTo,
  }: {
    visitedBy: number;
    visitedTo: number;
  }) {
    return this.prismaService.userWatchLog.create({
      data: {
        visitedBy: BigInt(visitedBy),
        visitedTo: BigInt(visitedTo),
      },
    });
  }

  async findMyLatestProfileVisitors(userId: number) {
    const latestVisits = await this.prismaService.userWatchLog.groupBy({
      by: ['visitedBy'],
      where: {
        visitedTo: BigInt(userId),
        userVisitedBy: {
          deletedAt: null,
          status: ActiveStatus.ACTIVE,
        },
      },
      _max: {
        visitedAt: true,
      },
      orderBy: {
        _max: {
          visitedAt: 'desc',
        },
      },
    });

    const visitorIds = latestVisits.map((visit) => visit.visitedBy);
    if (visitorIds.length === 0) {
      return [];
    }

    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: visitorIds },
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        nickname: true,
        sex: true,
        age: true,
        introText: true,
        profileImageUrl: true,
        address: {
          select: {
            fullName: true,
            sigunguName: true,
          },
        },
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return latestVisits.flatMap((visit) => {
      const visitedAt = visit._max.visitedAt;
      const user = usersById.get(visit.visitedBy);

      if (!visitedAt || !user) {
        return [];
      }

      return [{ user, visitedAt }];
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

  private async ensureDefaultAddress(defaultAddressCode: string) {
    await this.prismaService.address.upsert({
      where: { code: defaultAddressCode },
      update: {},
      create: {
        code: defaultAddressCode,
        sidoCode: '00',
        sigunguCode: '000',
        emdCode: '000',
        riCode: '00',
        fullName: 'Unknown',
        sidoName: 'Unknown',
        sigunguName: null,
        emdName: null,
        riName: null,
        level: AddressLevel.SIGUNGU,
        parentCode: null,
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
}
