import {
  IsString,
  IsArray,
  IsDateString,
  IsNumber,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    example: ['뜨개질', '산책', '영화'],
    description: '선택한 키워드 배열',
  })
  @IsArray()
  @IsString({ each: true })
  selectedKeywords: string[];

  @ApiProperty({
    example: [0.12, -0.98],
    description: 'Vibe 벡터 값',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'vibeVector는 비어있을 수 없습니다.' })
  @IsNumber({}, { each: true })
  vibeVector: number[];
}
