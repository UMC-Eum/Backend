import { Injectable } from '@nestjs/common';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementResponseDto } from '../dtos/agreement.dto';

@Injectable()
export class AgreementService {
    constructor( private readonly agreementRepository: AgreementRepository) {}

    async findAll(){
        const result = await this.agreementRepository.findAll();
        return { items : result.map(AgreementResponseDto.from) }
    }

    async upsertUserMarketingAgreement(userId: number, marketingAgreementId: number, isAgreed: boolean){
        return await this.agreementRepository.upsertUserMarketingAgreement(userId, marketingAgreementId, isAgreed);
    }
}
