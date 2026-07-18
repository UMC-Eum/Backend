import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubCategory } from '@prisma/client';

export class RecommendedMatchesPageDto {
  @ApiProperty({
    example: 3,
    description: '현재 페이지 크기',
  })
  size: number;

  @ApiProperty({
    example: true,
    description: '다음 페이지 존재 여부',
  })
  hasNext: boolean;

  @ApiPropertyOptional({
    example: 'eyJzaW1pbGFyaXR5U2NvcmUiOjEuMCwidXNlcklkIjoxMDh9',
    nullable: true,
    description: '다음 페이지 조회용 커서',
  })
  nextCursor: string | null;
}

export class RecommendedMatchesResponseDto {
  @ApiProperty({
    type: 'array',
    description: 'FastAPI 추천 결과 목록',
    items: {
      type: 'object',
      additionalProperties: true,
      example: {
        userId: '102',
        nickname: '루씨',
        matchScore: 0.91,
      },
    },
  })
  items: Record<string, unknown>[];

  @ApiProperty({
    type: RecommendedMatchesPageDto,
    description: '페이지네이션 메타데이터',
  })
  page: RecommendedMatchesPageDto;
}

export class RecommendedClubDto {
  @ApiProperty({ description: '클럽 ID', example: '7' })
  clubId: string;

  @ApiProperty({ description: '클럽 이름', example: '즉흥 여행 맛집 탐방' })
  name: string;

  @ApiProperty({
    description: '카테고리',
    enum: ClubCategory,
    example: ClubCategory.CULTURE_ART,
  })
  category: ClubCategory;

  @ApiProperty({
    description: '동/읍/면 주소 코드',
    example: '1159010800',
  })
  addressCode: string;

  @ApiProperty({
    description: '주소 이름',
    example: '서울특별시 동작구 대방동',
  })
  addressName: string;

  @ApiProperty({ description: '시도 코드', example: '11' })
  sidoCode: string;

  @ApiProperty({ description: '시군구 코드', example: '590' })
  sigunguCode: string;

  @ApiProperty({
    description: '클럽 소개',
    example:
      '주말에 갑자기 바다를 보러 가거나 새로운 맛집을 찾아다니는 즉흥 여행 동호회입니다.',
    nullable: true,
  })
  introText: string | null;

  @ApiProperty({
    description: '클럽 썸네일 URL',
    example: 'https://cdn.example.com/clubs/dummy-remaining-2.jpg',
    nullable: true,
  })
  thumbnailUrl: string | null;

  @ApiProperty({ description: '정원', example: 24 })
  capacity: number;

  @ApiProperty({ description: '좋아요 수', example: 55 })
  likes: number;

  @ApiProperty({
    description: '사용자와 클럽의 유사도 점수',
    example: 0.5109,
  })
  similarityScore: number;
}

export class RecommendedClubsPageDto {
  @ApiProperty({ description: '요청 페이지 크기', example: 20 })
  size: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: false })
  hasNext: boolean;

  @ApiPropertyOptional({
    description: '다음 페이지 조회용 커서',
    example: null,
    nullable: true,
  })
  nextCursor: string | null;
}

export class RecommendedClubsResponseDto {
  @ApiProperty({ type: [RecommendedClubDto] })
  items: RecommendedClubDto[];

  @ApiProperty({ type: RecommendedClubsPageDto })
  page: RecommendedClubsPageDto;
}
