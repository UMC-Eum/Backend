import { Injectable } from '@nestjs/common';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementResponseDto } from '../dtos/agreement.dto';
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
    isAgreed: boolean,
  ) {
    const agreement =
      await this.agreementRepository.findMarketingAgreementById(
        marketingAgreementId,
      );
    if (!agreement) {
      throw new AppException('AGREE_DOESNOT_EXIST');
    }
    return await this.agreementRepository.upsertUserMarketingAgreement(
      userId,
      marketingAgreementId,
      isAgreed,
    );
  }
  async getUserAgreementHistory(userId: number) {
    const result =
      await this.agreementRepository.getUserAgreementHistory(userId);
    if (result) return { hasPassed: true };
    else return { hasPassed: false };
  }
}
