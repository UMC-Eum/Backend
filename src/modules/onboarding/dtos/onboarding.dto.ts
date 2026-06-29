import {
  IsString,
  IsArray,
  IsDateString,
  IsNumber,
  ArrayNotEmpty,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProfileDto {
  @ApiProperty({ example: '루씨', description: '닉네임' })
  @IsString()
  nickname: string;

  @ApiProperty({ example: 'F', description: '성별 (M 또는 F)' })
  @IsString()
  gender: string;

  @ApiProperty({ example: '1972-03-01', description: '생년월일 (YYYY-MM-DD)' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '1168000000', description: '지역 코드' })
  @IsString()
  areaCode: string;

  @ApiProperty({ example: '안녕하세요 ...', description: '자기소개 텍스트' })
  @IsString()
  introText: string;

  @ApiProperty({
    example: 'https://cdn/.../intro.m4a',
    description: '자기소개 음성 URL',
  })
  @IsString()
  introAudioUrl: string;

  @ApiPropertyOptional({
    example: ['등산', '영화감상'],
    description: '선택한 키워드 배열 (FastAPI 분석 결과로 자동 설정 가능)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedKeywords?: string[];

  @ApiPropertyOptional({
    example: [0.12, -0.98],
    description: 'Vibe 벡터 값 (FastAPI 분석 결과로 자동 설정 가능)',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'vibeVector는 비어있을 수 없습니다.' })
  @IsNumber({}, { each: true })
  vibeVector?: number[];
}

export class CreateProfileRequestDto {
  @ApiProperty({ example: '루씨', description: '닉네임' })
  @IsString()
  nickname: string;

  @ApiProperty({ example: 'F', description: '성별 (M 또는 F)' })
  @IsString()
  gender: string;

  @ApiProperty({ example: '1972-03-01', description: '생년월일 (YYYY-MM-DD)' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '1168000000', description: '지역 코드' })
  @IsString()
  areaCode: string;

  @ApiProperty({ example: '안녕하세요 ...', description: '자기소개 텍스트' })
  @IsString()
  introText: string;

  @ApiProperty({
    example: 'https://cdn/.../intro.m4a',
    description: '자기소개 음성 URL',
  })
  @IsString()
  introAudioUrl: string;
}

export class CreateProfileResponseDto {
  @ApiProperty({ example: 101, description: '사용자 ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: true, description: '프로필 완료 여부' })
  profileCompleted: boolean;
}

export class AnalyzeClubVibeRequestDto {
  @ApiProperty({ example: 12, description: '분석/업데이트할 클럽 ID' })
  @Type(() => Number)
  @IsInt()
  clubId: number;

  @ApiProperty({
    example: '함께 새벽 산행할 분들 모집해요.',
    description: '동호회 소개 transcript',
  })
  @IsString()
  transcript: string;

  @ApiProperty({
    example: 'profile',
    description: 'FastAPI 분석 타입',
    default: 'profile',
  })
  @IsString()
  analysis_type: string;
}

export class ClubMatchedKeywordDto {
  @ApiProperty({ example: '등산' })
  keyword: string;
}

export class AnalyzeClubVibeResponseDto {
  @ApiProperty({ example: 12, description: '클럽 ID' })
  clubId: number;

  @ApiProperty({ example: '함께 새벽 산행할 분들 모집해요.' })
  transcript: string;

  @ApiProperty({
    example: '새벽 산행을 함께 즐기는 활동적인 동호회입니다.',
  })
  summary: string;

  @ApiProperty({ example: '12' })
  vectorId: string;

  @ApiProperty({ type: [ClubMatchedKeywordDto] })
  matchedKeywords: ClubMatchedKeywordDto[];

  @ApiProperty({ example: [0.12, -0.98] })
  vibeVector: number[];

  @ApiProperty({ example: true, description: '클럽 업데이트 완료 여부' })
  clubUpdated: boolean;
}
