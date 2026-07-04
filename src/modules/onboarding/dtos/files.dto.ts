import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const FILE_PURPOSES = [
  'PROFILE_INTRO_AUDIO',
  'PROFILE_IMAGE',
  'CLUB',
] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

export class PresignFileDto {
  @ApiProperty({
    example: 'intro.m4a',
    description: '업로드할 원본 파일명입니다.',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    example: 'audio/mp4',
    description: '업로드할 파일의 Content-Type입니다.',
  })
  @IsString()
  contentType: string;

  @ApiProperty({
    enum: FILE_PURPOSES,
    example: 'CLUB',
    description:
      '파일 업로드 목적입니다. PROFILE_INTRO_AUDIO는 프로필 소개 음성, PROFILE_IMAGE는 프로필 이미지, CLUB은 클럽 이미지입니다.',
  })
  @IsIn(FILE_PURPOSES)
  purpose: FilePurpose;
}
