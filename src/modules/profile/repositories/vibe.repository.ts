import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VibeRepository {
  constructor(private readonly prisma: PrismaService) {}

  setUserInterests(userId: number, interestIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId: BigInt(userId) } });
      if (!interestIds.length) return [];
      const data: Prisma.UserInterestCreateManyInput[] = interestIds.map((interestId) => ({
        userId: BigInt(userId),
        interestId: BigInt(interestId),
        vibeVector: [],
      }));
      return tx.userInterest.createMany({ data, skipDuplicates: true });
    });
  }

  setUserPersonalities(userId: number, personalityIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userPersonality.deleteMany({ where: { userId: BigInt(userId) } });
      if (!personalityIds.length) return [];
      const data: Prisma.UserPersonalityCreateManyInput[] = personalityIds.map((personalityId) => ({
        userId: BigInt(userId),
        personalityId: BigInt(personalityId),
        vibeVector: [],
      }));
      return tx.userPersonality.createMany({ data, skipDuplicates: true });
    });
  }

  setUserIdealPersonalities(userId: number, personalityIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userIdealPersonality.deleteMany({ where: { userId: BigInt(userId) } });
      if (!personalityIds.length) return [];
      const data: Prisma.UserIdealPersonalityCreateManyInput[] = personalityIds.map((personalityId) => ({
        userId: BigInt(userId),
        personalityId: BigInt(personalityId),
        vibeVector: [],
      }));
      return tx.userIdealPersonality.createMany({ data, skipDuplicates: true });
    });
  }

  listInterests(userId: number) {
    return this.prisma.userInterest.findMany({ where: { userId: BigInt(userId) }, include: { interest: true } });
  }

  listPersonalities(userId: number) {
    return this.prisma.userPersonality.findMany({ where: { userId: BigInt(userId) }, include: { personality: true } });
  }

  listIdealPersonalities(userId: number) {
    return this.prisma.userIdealPersonality.findMany({
      where: { userId: BigInt(userId) },
      include: { personality: true },
    });
  }
}
