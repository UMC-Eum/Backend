import { Injectable } from '@nestjs/common';
import { ActiveStatus, Prisma, Sex } from '@prisma/client';
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

  updateProfile(
    userId: number,
    data: {
      nickname?: string;
      sex?: Sex;
      birthdate?: Date;
      code?: string;
      introText?: string;
      introVoiceUrl?: string;
      profileImageUrl?: string;
    },
  ) {
    return this.prismaService.user.update({
      where: {
        id: BigInt(userId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      data,
    });
  }

  deactivateProfile(userId: number) {
    return this.prismaService.user.update({
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
}
