import { UserMarketingAgreement } from '@prisma/client';

// db이름이 서로 swap되어서 (userMarketingAgreement<->MarketingAgreement) 추후 수정 예정
export class AgreementResponseDto {
    agreementId: string;
    body: string;

    static from(entity: UserMarketingAgreement){
        return {
            agreementId: entity.id.toString(),
            body: entity.body
        }
    }

}