import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class UserIdealPersonalitiesUpdateRequestDto {
  @ApiProperty({ example: ['차분함', '신중함', '계획성'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  personalityKeywords: string[];

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
