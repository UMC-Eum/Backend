import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
