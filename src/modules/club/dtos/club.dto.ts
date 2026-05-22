import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ClubCategory } from '@prisma/client';

export enum ClubListSort {
  POPULAR = 'POPULAR',
  RECENT = 'RECENT',
  LIKES = 'LIKES',
}

export class ListClubsQueryDto {
  @ApiPropertyOptional({
    description: '이름/소개/키워드 검색어',
    example: '등산',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '카테고리 필터',
    enum: ClubCategory,
    example: ClubCategory.OUTDOOR,
  })
  @IsOptional()
  @IsEnum(ClubCategory)
  category?: ClubCategory;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ClubListSort,
    example: ClubListSort.POPULAR,
    default: ClubListSort.POPULAR,
  })
  @IsOptional()
  @IsEnum(ClubListSort)
  sort: ClubListSort = ClubListSort.POPULAR;

  @ApiPropertyOptional({ description: '페이지네이션 커서(base64url)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '가져올 클럽 수 (기본 20, 최대 50)',
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
  limit: number = 20;
}

export class ListTopHostsQueryDto {
  @ApiPropertyOptional({
    description: '가져올 호스트 수 (기본 10, 최대 50)',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

export class ClubListItemDto {
  @ApiProperty({ description: '클럽 ID', example: '1' })
  clubId: string;

  @ApiProperty({ description: '클럽 이름', example: '새벽 등산 모임' })
  name: string;

  @ApiProperty({
    description: '클럽 소개',
    example: '함께 새벽 산행할 분들 모집해요.',
    nullable: true,
  })
  introText: string | null;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    example: ClubCategory.OUTDOOR,
  })
  category: ClubCategory;

  @ApiProperty({
    description: '클럽 썸네일 URL',
    example: 'https://cdn.example.com/clubs/1.jpg',
    nullable: true,
  })
  thumbnailUrl: string | null;

  @ApiProperty({ description: '좋아요 수', example: 32 })
  likes: number;

  @ApiProperty({ description: '활성 멤버 수', example: 12 })
  memberCount: number;

  @ApiProperty({
    description: '클럽 키워드',
    example: ['등산', '새벽산책'],
  })
  keywords: string[];

  @ApiProperty({
    description: '생성 시각',
    example: '2026-05-01T20:25:00.000Z',
  })
  createdAt: string;
}

export class ListClubsResponseDto {
  @ApiProperty({
    description: '다음 페이지 커서',
    example:
      'eyJzb3J0IjoicmVjZW50Iiwic29ydEF0IjoiMjAyNi0wNS0wMVQyMDoyNTowMC4wMDBaIiwiY2x1YklkIjoiMSJ9',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({ type: [ClubListItemDto] })
  items: ClubListItemDto[];
}

export class CreateClubMeetingResponseDto {
  @ApiProperty({ description: '정모 ID', example: 88 })
  meetingId: number;

  @ApiProperty({ description: '클럽 ID', example: 12 })
  clubId: number;

  @ApiProperty({ description: '정모 이름', example: '5월 정규 정모' })
  name: string;

  @ApiProperty({
    description: '정모 일시',
    example: '2026-05-10T19:00:00.000Z',
  })
  date: string;

  @ApiProperty({ description: '정모 장소', example: '서울시 강남구 ○○카페' })
  spot: string;

  @ApiProperty({ description: '정기 정모 여부', example: true })
  isRegular: boolean;

  @ApiProperty({ description: '참석자 수', example: 0 })
  attendeeCount: number;

  @ApiProperty({
    description: '생성 시각',
    example: '2026-05-01T20:25:00.000Z',
  })
  createdAt: string;
}

export class HostListItemDto {
  @ApiProperty({ description: '호스트 ID', example: '42' })
  hostId: string;

  @ApiProperty({ description: '호스트 이름', example: '김등산' })
  name: string;

  @ApiProperty({
    description: '호스트 프로필 이미지 URL',
    example: 'https://cdn.example.com/users/42.jpg',
    nullable: true,
  })
  profileImageUrl: string | null;

  @ApiProperty({ description: '호스트가 운영하는 클럽 수', example: 5 })
  clubCount: number;

  @ApiProperty({
    description: '호스트가 운영하는 클럽들의 총 좋아요 수',
    example: 123,
  })
  totalLikes: number;
}

export class ListTopHostsResponseDto {
  @ApiProperty({ type: [HostListItemDto] })
  hosts: HostListItemDto[];
}
