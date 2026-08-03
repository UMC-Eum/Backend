import { Injectable } from '@nestjs/common';
import { AgreementType } from '@prisma/client';
import { AgreementRepository } from '../repositories/agreement.repository';
import {
  AgreementResponseDto,
  HasPassedResponseDto,
} from '../dtos/agreement.dto';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class AgreementService {
  constructor(private readonly agreementRepository: AgreementRepository) {}

  async findAll() {
    const result = await this.agreementRepository.findAll();
    return { items: result.map((item) => AgreementResponseDto.from(item)) };
  }

  async upsertUserMarketingAgreement(
    userId: number,
    marketingAgreementId: number,
    agreementType: AgreementType,
    agreementVersion: string,
    isAgreed: boolean,
  ) {
    const agreement =
      await this.agreementRepository.findMarketingAgreementByContract(
        marketingAgreementId,
        agreementType,
        agreementVersion,
      );
    if (!agreement) {
      throw new AppException('AGREE_DOESNOT_EXIST');
    }
    return await this.agreementRepository.upsertUserMarketingAgreement(
      userId,
      agreement,
      isAgreed,
    );
  }
  async getUserAgreementHistory(userId: number): Promise<HasPassedResponseDto> {
    const result =
      await this.agreementRepository.getUserAgreementHistory(userId);
    if (result) return { hasPassed: true };
    else return { hasPassed: false };
  }
}
