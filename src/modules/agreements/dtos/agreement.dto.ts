import { MarketingAgreementWithUser } from '../repositories/agreement.types';

export class AgreementResponseDto {
    agreementId: string;
    body: string;

    static from(entity: MarketingAgreementWithUser){
        return {
            agreementId: entity.marketingAgreementId.toString(),
            body: entity.userMarketingAgreement.body
        }
    }

}