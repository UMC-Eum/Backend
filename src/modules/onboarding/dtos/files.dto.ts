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

export class PresignFileResponseDto {
  @ApiProperty({
    example:
      'https://bucket.s3.ap-northeast-2.amazonaws.com/images/42/club/1783139000000_club-cover.jpg?...',
    description:
      'S3 PUT 업로드에만 사용하는 presigned URL입니다. 저장 API에 전달하지 않습니다.',
  })
  uploadUrl: string;

  @ApiProperty({
    example: 's3://bucket/images/42/club/1783139000000_club-cover.jpg',
    description:
      'DB 저장용 S3 객체 참조입니다. 프로필/클럽/게시글 저장 API에는 이 값을 전달합니다.',
  })
  fileRef: string;

  @ApiProperty({
    example: 'images/42/club/1783139000000_club-cover.jpg',
    description: 'S3 object key입니다.',
  })
  key: string;

  @ApiProperty({
    example: '2026-07-04T00:05:00.000Z',
    description: 'uploadUrl 만료 시각입니다.',
  })
  expiresAt: string;
}
