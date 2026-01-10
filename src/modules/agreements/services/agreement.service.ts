import { Injectable } from '@nestjs/common';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementResponseDto } from '../dtos/agreement.dto';

@Injectable()
export class AgreementService {
    constructor( private readonly agreementRepository: AgreementRepository) {}

    async findAll(){
        const result = await this.agreementRepository.findAll();
        return result.map(AgreementResponseDto.from)
    }
}
