import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendedMatchesResponseDto {
  @ApiPropertyOptional({
    example: 'MTAy',
    nullable: true,
    description: '다음 페이지 조회용 커서',
  })
  nextCursor: string | null;

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
}
