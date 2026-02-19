import { ApiPropertyOptional } from '@nestjs/swagger';
import { Sex } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UserProfileUpdateRequestDto {
  @ApiPropertyOptional({ example: '루씨' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ example: 'F', enum: Sex })
  @IsOptional()
  @IsEnum(Sex)
  gender?: Sex;

  @ApiPropertyOptional({ example: 53, description: '만 나이' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(150)
  age?: number;

  @ApiPropertyOptional({ example: '1168000000' })
  @IsOptional()
  @IsString()
  areaCode?: string;

  @ApiPropertyOptional({ example: '수정된 자기소개' })
  @IsOptional()
  @IsString()
  introText?: string;

  @ApiPropertyOptional({
    example: ['영화감상', '문학'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    example: ['타인배려', '배움욕구'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  personalities?: string[];

  @ApiPropertyOptional({
    example: ['유머사용', '성실함'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  idealPersonalities?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/files/intro.m4a' })
  @IsOptional()
  @IsUrl()
  introAudioUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/files/profile.jpg' })
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;
}
