import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';


@Injectable()
export class AgreementRepository {
    constructor(private readonly prisma: PrismaService) {}

    // GET v1/agreements
    findAll(){
        return this.prisma.marketingAgreement.findMany({
            orderBy: {id: 'asc'},
        });
    }

    // POST v1/users/me/agreements
    upsertUserMarketingAgreement(userId: number, marketingAgreementId: number, isAgreed: boolean,) {
        return this.prisma.userMarketingAgreement.upsert({
            where: {
                marketingAgreementId_userId: {
                userId: BigInt(userId),
                marketingAgreementId: BigInt(marketingAgreementId),
                },
            },
            update: { isAgreed },
            create: {
                userId: BigInt(userId),
                marketingAgreementId: BigInt(marketingAgreementId),
                isAgreed,
            },
        });
    }

}