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

  async upsertAppleUser({
    providerUserId,
    email,
    shouldUpdateEmail,
    nickname,
    defaultBirthdate,
    defaultAddressCode,
    defaultIntroVoiceUrl,
    defaultProfileImageUrl,
  }: {
    providerUserId: string;
    email: string;
    shouldUpdateEmail: boolean;
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
            ${AuthProvider.APPLE}::"AuthProvider",
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

      const where = {
        provider_providerUserId: {
          provider: AuthProvider.APPLE,
          providerUserId,
        },
      } as const;

      const updatedUser = shouldUpdateEmail
        ? await tx.user.update({ where, data: { email } })
        : await tx.user.findUniqueOrThrow({ where });

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

  findPublicProfileById(userId: number) {
    return this.prismaService.user.findFirst({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        nickname: true,
        age: true,
        sex: true,
        introText: true,
        profileImageUrl: true,
        address: {
          select: {
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
        clubs: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            category: true,
            introText: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        clubUsers: {
          where: {
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
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });
  }

  findMyClubs(userId: number) {
    return this.prismaService.clubUser.findMany({
      where: {
        userId: BigInt(userId),
        status: { in: [ClubUserStatus.ACTIVE, ClubUserStatus.PENDING] },
        club: { deletedAt: null },
      },
      select: {
        authority: true,
        status: true,
        joinedAt: true,
        club: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            category: true,
            capacity: true,
            code: true,
            introText: true,
            clubUsers: {
              where: { status: ClubUserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ joinedAt: 'desc' }, { requestedAt: 'desc' }],
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
            capacity: true,
            code: true,
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

  findActiveHeartSentByUser({
    sentById,
    sentToId,
  }: {
    sentById: number;
    sentToId: number;
  }) {
    return this.prismaService.heart.findFirst({
      where: {
        sentById: BigInt(sentById),
        sentToId: BigInt(sentToId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  async findMyLatestProfileVisitors({
    userId,
    cursor,
    take,
  }: {
    userId: number;
    cursor: { visitedAt: string; logId: string } | null;
    take: number;
  }) {
    const cursorCondition = cursor
      ? Prisma.sql`
          WHERE (
            latest."visitedAt" < ${cursor.visitedAt}::timestamp
            OR (
              latest."visitedAt" = ${cursor.visitedAt}::timestamp
              AND latest."logId" < ${BigInt(cursor.logId)}
            )
          )
        `
      : Prisma.empty;

    const rows = await this.prismaService.$queryRaw<
      Array<{
        id: bigint;
        nickname: string;
        sex: Sex;
        age: number;
        introText: string;
        profileImageUrl: string;
        addressFullName: string | null;
        addressSigunguName: string | null;
        logId: bigint;
        visitedAt: Date;
        visitedAtCursor: string;
      }>
    >(Prisma.sql`
      WITH latest AS (
        SELECT DISTINCT ON (uwl."visitedBy")
          uwl."id" AS "logId",
          uwl."visitedBy",
          uwl."visitedAt"
        FROM "UserWatchLog" uwl
        INNER JOIN "User" visitor ON visitor."id" = uwl."visitedBy"
        WHERE uwl."visitedTo" = ${BigInt(userId)}
          AND visitor."deletedAt" IS NULL
          AND visitor."status" = ${ActiveStatus.ACTIVE}::"ActiveStatus"
        ORDER BY uwl."visitedBy", uwl."visitedAt" DESC, uwl."id" DESC
      )
      SELECT
        visitor."id",
        visitor."nickname",
        visitor."sex",
        visitor."age",
        visitor."introText",
        visitor."profileImageUrl",
        address."fullName" AS "addressFullName",
        address."sigunguName" AS "addressSigunguName",
        latest."logId",
        latest."visitedAt",
        to_char(latest."visitedAt", 'YYYY-MM-DD HH24:MI:SS.US') AS "visitedAtCursor"
      FROM latest
      INNER JOIN "User" visitor ON visitor."id" = latest."visitedBy"
      LEFT JOIN "Address" address ON address."code" = visitor."code"
      ${cursorCondition}
      ORDER BY latest."visitedAt" DESC, latest."logId" DESC
      LIMIT ${take}
    `);

    return rows.map((row) => ({
      logId: row.logId,
      visitedAt: row.visitedAt,
      visitedAtCursor: row.visitedAtCursor,
      user: {
        id: row.id,
        nickname: row.nickname,
        sex: row.sex,
        age: row.age,
        introText: row.introText,
        profileImageUrl: row.profileImageUrl,
        address:
          row.addressFullName || row.addressSigunguName
            ? {
                fullName: row.addressFullName,
                sigunguName: row.addressSigunguName,
              }
            : null,
      },
    }));
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
