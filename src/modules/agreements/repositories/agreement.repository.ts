import { Injectable } from '@nestjs/common';
import { AgreementType, MarketingAgreement } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AgreementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // GET v1/agreements
  findAll() {
    return this.prisma.marketingAgreement.findMany({
      orderBy: { id: 'asc' },
    });
  }

  // POST v1/users/me/agreements
  upsertUserMarketingAgreement(
    userId: number,
    agreement: MarketingAgreement,
    isAgreed: boolean,
  ) {
    return this.prisma.userMarketingAgreement.upsert({
      where: {
        marketingAgreementId_userId: {
          userId: BigInt(userId),
          marketingAgreementId: agreement.id,
        },
      },
      update: {
        isAgreed,
        agreementType: agreement.type,
        agreementVersion: agreement.version,
      },
      create: {
        userId: BigInt(userId),
        marketingAgreementId: agreement.id,
        agreementType: agreement.type,
        agreementVersion: agreement.version,
        isAgreed,
      },
    });
  }

  findMarketingAgreementById(agreementId: number) {
    return this.prisma.marketingAgreement.findUnique({
      where: {
        id: BigInt(agreementId),
      },
    });
  }

  findMarketingAgreementByContract(
    agreementId: number,
    agreementType: AgreementType,
    agreementVersion: string,
  ) {
    return this.prisma.marketingAgreement.findFirst({
      where: {
        id: BigInt(agreementId),
        type: agreementType,
        version: agreementVersion,
      },
    });
  }
  // GET api/v1/me/agreements
  getUserAgreementHistory(userId: number) {
    const result = this.prisma.userMarketingAgreement.findFirst({
      where: {
        userId: BigInt(userId),
      },
    });
    return result;
  }
}
