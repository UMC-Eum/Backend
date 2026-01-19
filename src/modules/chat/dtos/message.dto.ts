import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { ChatMediaType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ enum: ChatMediaType, example: 'AUDIO' })
  @IsEnum(ChatMediaType)
  @IsNotEmpty()
  type!: ChatMediaType;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @ValidateIf((o) => (o as SendMessageDto).type === 'TEXT')
  @IsString()
  @IsNotEmpty({ message: 'TEXT 타입일 때 text는 필수입니다.' })
  text?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/m9001.m4a' })
  @IsOptional()
  @ValidateIf((o) => (o as SendMessageDto).type !== 'TEXT')
  @IsUrl({}, { message: 'mediaUrl은 유효한 URL 형식이어야 합니다.' })
  @IsNotEmpty({ message: '미디어 메시지일 때 mediaUrl은 필수입니다.' })
  mediaUrl?: string | null;

  @ApiPropertyOptional({ example: 4, description: 'AUDIO 타입일 때 필수' })
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

  @ApiPropertyOptional({ example: 30, default: 30, minimum: 1, maximum: 100 })
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
