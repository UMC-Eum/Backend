import { Injectable } from '@nestjs/common';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementResponseDto } from '../dtos/agreement.dto';

@Injectable()
export class AgreementService {
    constructor( private readonly agreementRepository: AgreementRepository) {}

    async findAll(userId: number){
        const result = await this.agreementRepository.findAll(userId);
        return result.map(AgreementResponseDto.from)
    }
}
