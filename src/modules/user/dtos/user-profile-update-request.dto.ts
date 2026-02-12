import { ApiPropertyOptional } from '@nestjs/swagger';
import { Sex } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
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
    example: ['뜨개질', '산책', '영화', '문화생활'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    example: ['다정함', '배려'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  personalities?: string[];

  @ApiPropertyOptional({
    example: ['유머', '성실'],
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
