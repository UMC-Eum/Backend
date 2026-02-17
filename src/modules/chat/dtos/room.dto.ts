import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import type { ChatMediaType } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({ example: 9, description: '상대 사용자 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  targetUserId!: number;
}

export class ListRoomsQueryDto {
  @ApiPropertyOptional({ description: 'opaque cursor (base64url)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '가져올 아이템 수 (기본 20, 최대 50)',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}

export type PeerBase = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
};

export type PeerWithArea = PeerBase & {
  areaName: string | null;
};

export type CreateRoomRes = {
  chatRoomId: number;
  created: boolean;
  peer: PeerBase;
};

export type RoomListItem = {
  chatRoomId: number;
  peer: PeerWithArea;
  lastMessage: null | {
    type: ChatMediaType;
    textPreview: string;
    sentAt: string;
  };
  unreadCount: number;
};

export type ListRoomsRes = {
  nextCursor: string | null;
  items: RoomListItem[];
};

export type RoomDetailRes = {
  chatRoomId: number;
  joinedAt: string;
  peer: {
    userId: number;
    nickname: string;
    age: number;
    areaName: string | null;
    profileImageUrl: string | null;
  };
};
