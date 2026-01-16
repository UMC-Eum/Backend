import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UserProfileUpdateRequestDto {
  @ApiPropertyOptional({ example: '루씨' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ example: '1168000000' })
  @IsOptional()
  @IsString()
  areaCode?: string;

  @ApiPropertyOptional({ example: '수정된 자기소개' })
  @IsOptional()
  @IsString()
  introText?: string;
}
