import { Prisma } from '@prisma/client';

export const marketingAgreementWithUserArgs =
  Prisma.validator<Prisma.MarketingAgreementFindManyArgs>()({
    include: {
      userMarketingAgreement: true,
    },
  });

export type MarketingAgreementWithUser = Prisma.MarketingAgreementGetPayload<
  typeof marketingAgreementWithUserArgs
>;
