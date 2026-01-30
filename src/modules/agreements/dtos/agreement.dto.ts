import { MarketingAgreement } from '@prisma/client';
import { IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AgreementResponseDto {
  agreementId: string;
  body: string;

  static from(entity: MarketingAgreement) {
    return {
      agreementId: entity.id.toString(),
      body: entity.body,
    };
  }
}

// marketingAgreement<->userMarketingAgreement 조인이 필요할 때 사용할 dto
export class AgreementItemDto {
  @IsNumber()
  @ApiProperty({ example: 1 })
  marketingAgreementId: number;
  @IsBoolean()
  @ApiProperty({ example: true })
  isAgreed: boolean;
}

export class CreateUserAgreementRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgreementItemDto)
  @ApiProperty({
    type: [AgreementItemDto],
    description: '마케팅 동의 약관',
  })
  marketingAgreements: AgreementItemDto[];
}

export class hasPassedResponseDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasPassed: boolean;
}
