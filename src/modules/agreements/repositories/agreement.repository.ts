import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';


@Injectable()
export class AgreementRepository {
    constructor(private readonly prisma: PrismaService) {}

    // GET v1/agreements
    findAll(){
        return this.prisma.userMarketingAgreement.findMany({
            orderBy: {id: 'asc'},
        });
    }
}