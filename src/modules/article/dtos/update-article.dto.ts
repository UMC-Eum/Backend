import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateArticleDto {
  @ApiPropertyOptional({ example: '수정된 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '수정된 내용입니다.' })
  @IsOptional()
  @IsString()
  contents?: string;

  @ApiPropertyOptional({ example: ArticleCategory.FREE, enum: ArticleCategory })
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/articles/new.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];
}
