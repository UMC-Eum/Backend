import { Injectable } from '@nestjs/common';
import { ActiveStatus, Prisma } from '@prisma/client';
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
        birthdate: true,
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
      },
    });
  }

  updateProfile(
    userId: number,
    data: { nickname?: string; code?: string; introText?: string },
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
            vibeVector: Prisma.JsonNull,
          }));

        if (createData.length > 0) {
          await tx.userInterest.createMany({ data: createData });
        }
      }
    });
  }
}