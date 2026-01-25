import { ApiProperty } from '@nestjs/swagger';
import { Sex } from '@prisma/client';

class UserAreaDto {
  @ApiProperty({ example: '1168000000' })
  code: string;

  @ApiProperty({ example: '강남구' })
  name: string;
}

export class UserMeResponseDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: '루씨' })
  nickname: string;

  @ApiProperty({ example: 'F', enum: Sex })
  gender: Sex;

  @ApiProperty({ example: '1972-03-01' })
  birthDate: string;

  @ApiProperty({ type: UserAreaDto })
  area: UserAreaDto;

  @ApiProperty({ example: '안녕하세요 ...' })
  introText: string;

  @ApiProperty({ example: ['뜨개질', '산책', '영화', '문화생활'] })
  keywords: string[];

  @ApiProperty({ example: ['다정함', '배려'] })
  personalities: string[];

  @ApiProperty({ example: ['유머', '성실'] })
  idealPersonalities: string[];

  @ApiProperty({ example: 'https://cdn.example.com/files/intro.m4a' })
  introAudioUrl: string;

  @ApiProperty({ example: 'https://cdn.example.com/files/profile.jpg' })
  profileImageUrl: string;
}
