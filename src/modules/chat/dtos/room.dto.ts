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
  isWithdrawn: boolean;
};

export type PeerWithArea = PeerBase & {
  areaName: string | null;
};

export type CreateRoomRes = {
  chatRoomId: number;
  created: boolean;
  peer: PeerBase;
};

export type ClubBrief = {
  clubId: number;
  name: string;
  thumbnailUrl: string | null;
};

export type LastMessage = null | {
  type: ChatMediaType;
  textPreview: string;
  sentAt: string;
};

export type DirectRoomListItem = {
  chatRoomId: number;
  type: 'DIRECT';
  peer: PeerWithArea;
  lastMessage: LastMessage;
  unreadCount: number;
};

export type ClubRoomListItem = {
  chatRoomId: number;
  type: 'CLUB';
  club: ClubBrief;
  memberCount: number;
  lastMessage: LastMessage;
  unreadCount: number;
};

export type RoomListItem = DirectRoomListItem | ClubRoomListItem;

export type ListRoomsRes = {
  nextCursor: string | null;
  items: RoomListItem[];
};

export type DirectRoomDetailRes = {
  chatRoomId: number;
  type: 'DIRECT';
  joinedAt: string;
  peer: {
    userId: number;
    nickname: string;
    age: number;
    areaName: string | null;
    profileImageUrl: string | null;
    isWithdrawn: boolean;
  };
};

export type ClubRoomMember = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  role: 'GENERAL' | 'HOST';
  isWithdrawn: boolean;
};

export type ClubRoomDetailRes = {
  chatRoomId: number;
  type: 'CLUB';
  joinedAt: string;
  club: ClubBrief;
  memberCount: number;
  members: ClubRoomMember[];
};

export type RoomDetailRes = DirectRoomDetailRes | ClubRoomDetailRes;
