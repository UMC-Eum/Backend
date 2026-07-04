import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ClubAuthority, ClubCategory } from '@prisma/client';

export enum ClubListSort {
  POPULAR = 'POPULAR',
  RECENT = 'RECENT',
  LIKES = 'LIKES',
}

export enum ClubJoinPolicy {
  AUTO = 'AUTO',
  APPROVAL = 'APPROVAL',
}

export class CreateClubRequestDto {
  @ApiProperty({ description: '클럽 이름', example: '보이스 러버즈' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    enumName: 'ClubCategory',
    example: ClubCategory.OTHERS,
  })
  @IsEnum(ClubCategory)
  category: ClubCategory;

  @ApiProperty({
    description: '클럽 소개',
    example: '목소리로 친해져요',
  })
  @IsString()
  introText: string;

  @ApiProperty({ description: '정원', example: 30, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: '동/읍/면 주소 코드',
    example: '1168000000',
  })
  @IsString()
  areaCode: string;

  @ApiProperty({
    description:
      '가입 승인 필요 여부. true면 승인 가입, false면 자유 가입입니다.',
    example: false,
  })
  @IsBoolean()
  approvalRequired: boolean;

  @ApiProperty({
    description:
      '게시판 공개 여부. true면 전체 공개, false면 회원에게만 공개입니다.',
    example: true,
  })
  @IsBoolean()
  boardPublic: boolean;
}

export class CreateClubHostDto {
  @ApiProperty({ description: '호스트 사용자 ID', example: 7 })
  userId: number;

  @ApiProperty({ description: '호스트 닉네임', example: '보이스마스터' })
  nickname: string;

  @ApiProperty({
    description: '호스트 프로필 이미지 URL',
    example: 'https://cdn.example.com/profile/7.jpg',
    nullable: true,
  })
  profileImageUrl: string | null;
}

export class CreateClubResponseDto {
  @ApiProperty({ description: '클럽 ID', example: 12 })
  clubId: number;

  @ApiProperty({
    description: '동/읍/면 주소 코드. 기존 응답 호환을 위한 필드입니다.',
    example: '1168000000',
  })
  code: string;

  @ApiProperty({ description: '클럽 이름', example: '보이스 러버즈' })
  name: string;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    enumName: 'ClubCategory',
    example: ClubCategory.OTHERS,
  })
  category: ClubCategory;

  @ApiProperty({ description: '정원', example: 30 })
  capacity: number;

  @ApiProperty({
    description: '동/읍/면 주소 코드',
    example: '1168000000',
    nullable: true,
  })
  areaCode: string | null;

  @ApiProperty({
    description: '가입 승인 필요 여부',
    example: false,
  })
  approvalRequired: boolean;

  @ApiProperty({
    description: '게시판 공개 여부',
    example: true,
  })
  boardPublic: boolean;

  @ApiProperty({ description: '활성 멤버 수', example: 1 })
  memberCount: number;

  @ApiProperty({ type: CreateClubHostDto })
  host: CreateClubHostDto;

  @ApiProperty({
    description: '생성 시각',
    example: '2026-05-01T16:35:00.000Z',
  })
  createdAt: string;
}

export class UpdateClubRequestDto {
  @ApiPropertyOptional({
    description: '클럽 이름',
    example: '등산 러버즈 시즌3',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '클럽 소개',
    example: '더 즐겁게 모여요',
  })
  @IsOptional()
  @IsString()
  introText?: string;

  @ApiPropertyOptional({
    description: '클럽 소개 음성 URL. null이면 음성 소개를 제거합니다.',
    example: 'https://cdn.example.com/voice/12-v2.mp3',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  introVoice?: string | null;

  @ApiPropertyOptional({ description: '정원', example: 60, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    description: '카테고리',
    enum: ClubCategory,
    example: ClubCategory.HOBBY,
  })
  @IsOptional()
  @IsEnum(ClubCategory)
  category?: ClubCategory;
}

export class UpdateClubResponseDto {
  @ApiProperty({ description: '클럽 ID', example: '12' })
  clubId: string;

  @ApiProperty({ description: '클럽 이름', example: '등산 러버즈 시즌3' })
  name: string;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    example: ClubCategory.HOBBY,
  })
  category: ClubCategory;

  @ApiProperty({
    description: '클럽 소개',
    example: '더 즐겁게 모여요',
    nullable: true,
  })
  introText: string | null;

  @ApiProperty({
    description: '클럽 소개 음성 URL',
    example: null,
    nullable: true,
  })
  introVoice: string | null;

  @ApiProperty({ description: '정원', example: 60 })
  capacity: number;

  @ApiProperty({
    description: '수정 시각',
    example: '2026-05-01T20:25:00.000Z',
    nullable: true,
  })
  updatedAt: string | null;
}

export class DeleteClubResponseDto {
  @ApiProperty({ description: '클럽 ID', example: '12' })
  clubId: string;

  @ApiProperty({
    description: '삭제 처리 시각',
    example: '2026-05-01T18:50:00.000Z',
  })
  deletedAt: string;
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
    example: ClubCategory.HOBBY,
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
    example: ClubCategory.HOBBY,
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

export class ClubDetailHostDto {
  @ApiProperty({ description: '호스트 사용자 ID', example: '7' })
  userId: string;

  @ApiProperty({ description: '호스트 닉네임', example: '보이스마스터' })
  nickname: string;

  @ApiProperty({
    description: '호스트 프로필 이미지 URL',
    example: 'https://cdn.example.com/profile/7.jpg',
    nullable: true,
  })
  profileImageUrl: string | null;
}

export class ClubDetailMeetingDto {
  @ApiProperty({ description: '정모 ID', example: '88' })
  meetingId: string;

  @ApiProperty({ description: '정모 이름', example: '주간 정모' })
  name: string;

  @ApiProperty({ description: '정모 요일', example: 'FRI', nullable: true })
  day: string | null;

  @ApiProperty({
    description: '정모 시간',
    example: '20:00:00',
    nullable: true,
  })
  time: string | null;
}

export class ClubDetailResponseDto {
  @ApiProperty({ description: '클럽 ID', example: '12' })
  clubId: string;

  @ApiProperty({ description: '클럽 이름', example: '등산 러버즈' })
  name: string;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    example: ClubCategory.HOBBY,
  })
  category: ClubCategory;

  @ApiProperty({
    description: '클럽 소개 음성 URL',
    example: 'https://cdn.example.com/voice/12.mp3',
    nullable: true,
  })
  introVoice: string | null;

  @ApiProperty({
    description: '클럽 소개',
    example: '등산으로 친해져요',
    nullable: true,
  })
  introText: string | null;

  @ApiProperty({ description: '정원', example: 30 })
  capacity: number;

  @ApiProperty({
    description: '가입 방식. AUTO는 자유 가입, APPROVAL은 승인 가입입니다.',
    enum: ClubJoinPolicy,
    example: ClubJoinPolicy.AUTO,
  })
  joinPolicy: ClubJoinPolicy;

  @ApiProperty({ description: '활성 멤버 수', example: 18 })
  memberCount: number;

  @ApiProperty({ description: '좋아요 수', example: 142 })
  likes: number;

  @ApiProperty({ description: '좋아요 여부', example: false })
  isLiked: boolean;

  @ApiProperty({ description: '가입 여부', example: true })
  isJoined: boolean;

  @ApiProperty({
    description: '내 권한',
    enum: ClubAuthority,
    nullable: true,
    example: ClubAuthority.GENERAL,
  })
  myAuthority: ClubAuthority | null;

  @ApiProperty({ type: ClubDetailHostDto, nullable: true })
  host: ClubDetailHostDto | null;

  @ApiProperty({ type: [ClubDetailMeetingDto] })
  meetings: ClubDetailMeetingDto[];

  @ApiProperty({
    description: '생성 시각',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: string;
}

export class LikeClubResponseDto {
  @ApiProperty({ description: '클럽 ID', example: '12' })
  clubId: string;

  @ApiProperty({ description: '좋아요 여부', example: true })
  isLiked: boolean;

  @ApiProperty({ description: '좋아요 수', example: 143 })
  likeCount: number;
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
