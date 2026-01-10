import { UserMarketingAgreement } from '@prisma/client';
import { IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

export class AgreementItemDto {
    @IsNumber()
    @ApiProperty({example : 1})
    marketingAgreementId: number;
    @IsBoolean()
    @ApiProperty({example : true})
    isAgreed: boolean;
}

export class CreateUserAgreementRequestDto {
    @IsArray()
    @ValidateNested({each:true})
    @Type(() => AgreementItemDto)
    @ApiProperty({
        type: [AgreementItemDto],
        description: '마케팅 동의 약관',
    })
    marketingAgreements : AgreementItemDto[];
}
