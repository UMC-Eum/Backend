import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';
import { IsString, IsEnum, IsArray, IsOptional, IsUrl } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ example: '이번 주 정모 후기 공유합니다!' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '어제 정말 즐거운 시간이었어요...' })
  @IsString()
  contents!: string;

  @ApiProperty({ example: ArticleCategory.REVIEW, enum: ArticleCategory })
  @IsEnum(ArticleCategory)
  category!: ArticleCategory;

  @ApiPropertyOptional({
    example: [
      'https://cdn.example.com/articles/abc123.jpg',
      'https://cdn.example.com/articles/def456.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];
}
