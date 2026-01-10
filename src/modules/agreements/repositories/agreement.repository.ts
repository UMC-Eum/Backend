import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';


@Injectable()
export class AgreementRepository {
    constructor(private readonly prisma: PrismaService) {}

    // GET v1/agreements
    findAll(userId : number){
        return this.prisma.marketingAgreement.findMany({
            include : {
                userMarketingAgreement: true,
            },
            where: {userId},
            orderBy: {marketingAgreementId: 'asc'},
        });
    }
}