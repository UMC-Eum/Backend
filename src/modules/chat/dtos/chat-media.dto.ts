import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const CHAT_UPLOAD_TYPES = ['AUDIO', 'PHOTO', 'VIDEO'] as const;
export type ChatUploadType = (typeof CHAT_UPLOAD_TYPES)[number];

export class CreateChatMediaPresignDto {
  @ApiProperty({
    enum: CHAT_UPLOAD_TYPES,
    example: 'PHOTO',
    description: '업로드할 미디어 타입 (AUDIO/PHOTO/VIDEO)',
  })
  @IsIn(CHAT_UPLOAD_TYPES)
  @IsNotEmpty()
  type!: ChatUploadType;

  @ApiProperty({
    example: 'photo.jpg',
    description: '원본 파일명 (확장자 포함)',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'Content-Type',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiPropertyOptional({
    example: 1024 * 1024,
    description: '파일 크기(바이트). 서버에서 제한/검증 용도(선택)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes?: number;
}

export type CreateChatMediaPresignRes = {
  uploadUrl: string;
  mediaRef: string; // s3://bucket/key
  key: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};
