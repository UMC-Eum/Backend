import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class UserIdealMatchedKeywordDto {
  @ApiProperty({ example: 'PERSONALITY' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiProperty({ example: '차분함' })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({ example: 0.86 })
  @IsOptional()
  @IsNumber()
  score?: number;
}

export class UserIdealPersonalitiesUpdateRequestDto {
  @ApiPropertyOptional({ example: ['차분함', '신중함', '계획성'] })
  @ValidateIf(
    (dto: UserIdealPersonalitiesUpdateRequestDto) =>
      !Array.isArray(dto.matchedKeywords) || dto.matchedKeywords.length === 0,
  )
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  personalityKeywords?: string[];

  @ApiPropertyOptional({
    type: [UserIdealMatchedKeywordDto],
    description:
      'FastAPI 이상형 분석 결과입니다. 제공되면 category가 PERSONALITY인 keyword만 이상형 성향으로 저장합니다.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserIdealMatchedKeywordDto)
  matchedKeywords?: UserIdealMatchedKeywordDto[];

  @ApiPropertyOptional({
    example: ['영화감상', '문학'],
    description: '허용만 하며 이상형 성향 업데이트 처리에는 사용하지 않습니다.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  interest?: string[];
}

export class UserIdealPersonalitiesUpdateResponseDto {
  @ApiProperty({ example: ['차분함', '신중함'] })
  idealPersonalities: string[];
}
