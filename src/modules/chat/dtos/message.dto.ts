import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { ChatMediaType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({
    enum: ChatMediaType,
    example: 'AUDIO',
    description: '메시지 타입 (TEXT/AUDIO/PHOTO/VIDEO)',
  })
  @IsEnum(ChatMediaType)
  @IsNotEmpty()
  type!: ChatMediaType;

  @ApiPropertyOptional({
    example: null,
    description: 'TEXT 타입일 때 필수 (미디어 타입일 때는 null)',
  })
  @IsOptional()
  @ValidateIf((o) => (o as SendMessageDto).type === 'TEXT')
  @IsString()
  @IsNotEmpty({ message: 'TEXT 타입일 때 text는 필수입니다.' })
  text?: string | null;

  @ApiPropertyOptional({
    example: 's3://eum-chat-media/chat/101/1/1700000000000_uuid_photo.jpg',
    description:
      'TEXT를 제외한 타입일 때 필수. presign 응답의 mediaRef 또는 S3 객체 URL(https)을 전달합니다.',
  })
  @IsOptional()
  @ValidateIf((o) => (o as SendMessageDto).type !== 'TEXT')
  @IsString()
  @IsNotEmpty({ message: '미디어 메시지일 때 mediaUrl은 필수입니다.' })
  mediaUrl?: string | null;

  @ApiPropertyOptional({
    example: 4,
    description: 'AUDIO 타입일 때 필수 (초 단위)',
  })
  @IsOptional()
  @ValidateIf((o) => (o as SendMessageDto).type === 'AUDIO')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationSec?: number | null;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ description: 'opaque cursor (base64url)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '가져올 아이템 수 (기본 30, 최대 100)',
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export type MessageItem = {
  messageId: number;
  type: ChatMediaType;
  text: string | null;
  mediaUrl: string | null;
  durationSec: number | null;
  senderUserId: number;
  sentAt: string;
  readAt: string | null;
  isMine: boolean;
};

export type PeerInfo = {
  userId: number;
  nickname: string;
  age: number;
  areaName: string | null;
};

export type ListMessagesRes = {
  chatRoomId: number;
  peer: PeerInfo;
  items: MessageItem[];
  nextCursor: string | null;
};

export type SendMessageRes = {
  messageId: number;
  sentAt: string;
};
