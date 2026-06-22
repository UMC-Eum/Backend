import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const ARTICLE_SORTS = ['recent', 'popular'] as const;
export type ArticleSort = (typeof ARTICLE_SORTS)[number];

export class ListArticlesQueryDto {
  @ApiPropertyOptional({
    description: '게시글 카테고리. 생략 시 전체 조회',
    enum: ArticleCategory,
    example: ArticleCategory.FREE,
  })
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ARTICLE_SORTS,
    default: 'recent',
    example: 'recent',
  })
  @IsOptional()
  @IsIn(ARTICLE_SORTS)
  sort?: ArticleSort;

  @ApiPropertyOptional({
    description: '다음 페이지 커서 (Base64 인코딩). 첫 페이지에서는 생략',
    example: 'eyJpZCI6IjExIn0=',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9+/]*={0,2}$/, { message: 'cursor must be a valid Base64 string' })
  cursor?: string;

  @ApiPropertyOptional({
    description: '가져올 아이템 수 (기본 20, 최대 50)',
    default: 20,
    minimum: 1,
    maximum: 50,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
