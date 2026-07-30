import { AgreementType, MarketingAgreement } from '@prisma/client';
import {
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AgreementResponseDto {
  agreementId: string;
  body: string;
  type: AgreementType;
  version: string;
  isRequired: boolean;

  static from(entity: MarketingAgreement) {
    return {
      agreementId: entity.id.toString(),
      body: entity.body,
      type: entity.type,
      version: entity.version,
      isRequired: entity.isRequired,
    };
  }
}

// marketingAgreement<->userMarketingAgreement 조인이 필요할 때 사용할 dto
export class AgreementItemDto {
  @IsNumber()
  @ApiProperty({ example: 1 })
  marketingAgreementId: number;

  @IsEnum(AgreementType)
  @ApiProperty({ enum: AgreementType, example: AgreementType.POLICY })
  agreementType: AgreementType;

  @IsString()
  @ApiProperty({ example: '1.0.0' })
  agreementVersion: string;

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
    description: '약관 동의 목록',
  })
  marketingAgreements: AgreementItemDto[];
}

export class HasPassedResponseDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasPassed: boolean;
}
