import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ArticleCategory, ClubAuthority } from '@prisma/client';
import { IsBoolean } from 'class-validator';

export class ArticleAuthorDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '달콤한목소리' })
  nickname!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/profile/42.jpg',
  })
  profileImageUrl!: string;
}

export class ArticleDetailAuthorDto extends ArticleAuthorDto {
  @ApiProperty({ example: ClubAuthority.GENERAL, enum: ClubAuthority })
  authority!: ClubAuthority;
}

export class ArticlePhotoDto {
  @ApiProperty({ example: 901 })
  photoId!: number;

  @ApiProperty({
    example: 'https://cdn.example.com/articles/abc123.jpg',
  })
  photoUrl!: string;
}

export class ArticleDto {
  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: 1 })
  clubId!: number;

  @ApiProperty({ example: '이번 주 정모 후기 공유합니다!' })
  title!: string;

  @ApiProperty({ example: '어제 정말 즐거운 시간이었어요...' })
  contents!: string;

  @ApiProperty({ example: ArticleCategory.REVIEW, enum: ArticleCategory })
  category!: ArticleCategory;

  @ApiProperty({ example: false })
  isPinned!: boolean;

  @ApiProperty({ example: 0 })
  viewCount!: number;

  @ApiProperty({ example: 0 })
  likeCount!: number;

  @ApiProperty({ example: 0 })
  commentCount!: number;

  @ApiProperty({ type: ArticleAuthorDto, nullable: true })
  author!: ArticleAuthorDto | null;

  @ApiProperty({ type: [ArticlePhotoDto] })
  photos!: ArticlePhotoDto[];

  @ApiProperty({ example: '2026-05-01T14:30:00.000Z' })
  createdAt!: string;
}

export class ArticleListAuthorDto extends ArticleAuthorDto {}

export class ArticleListItemDto {
  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: '이번 주 정모 후기 공유합니다!' })
  title!: string;

  @ApiProperty({ example: '어제 정말 즐거운 시간이었어요. 다음에도 꼭 참석하고 싶네요...' })
  preview!: string;

  @ApiProperty({ example: ArticleCategory.REVIEW, enum: ArticleCategory })
  category!: ArticleCategory;

  @ApiProperty({ example: false })
  isPinned!: boolean;

  @ApiProperty({ example: 0 })
  viewCount!: number;

  @ApiProperty({ example: 0 })
  likeCount!: number;

  @ApiProperty({ example: 0 })
  commentCount!: number;

  @ApiProperty({ example: null, nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: ArticleListAuthorDto, nullable: true })
  author!: ArticleListAuthorDto | null;

  @ApiProperty({ example: '2026-05-01T14:30:00.000Z' })
  createdAt!: string;
}

export class ListArticlesResponseDto {
  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ type: [ArticleListItemDto] })
  articles!: ArticleListItemDto[];

  @ApiProperty({ example: 'eyJpZCI6MTAyM30=' })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class ArchivePhotoItemDto {
  @ApiProperty({ example: 101 })
  photoId!: number;

  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: 'https://cdn.example.com/articles/abc123.jpg' })
  photoUrl!: string;

  @ApiProperty({ example: '2026-05-01T17:40:00.000Z' })
  createdAt!: string;
}

export class GetArchiveResponseDto {
  @ApiProperty({ type: [ArchivePhotoItemDto] })
  items!: ArchivePhotoItemDto[];

  @ApiProperty({ example: 'eyJpZCI6MTAyM30=' })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class ArticleCommentReplyDto {
  @ApiProperty({ example: 556 })
  commentId!: number;

  @ApiProperty({ example: 555, nullable: true })
  parentCommentId!: number | null;

  @ApiProperty({ example: 1 })
  depth!: number;

  @ApiProperty({ example: '감사합니다!' })
  contents!: string;

  @ApiProperty({ example: false })
  isMine!: boolean;

  @ApiProperty({ type: ArticleDetailAuthorDto, nullable: true })
  author!: ArticleDetailAuthorDto | null;

  @ApiProperty({ example: '2026-05-01T15:25:00.000Z' })
  createdAt!: string;
}

export class ArticleCommentDto extends ArticleCommentReplyDto {
  @ApiProperty({ type: [ArticleCommentReplyDto] })
  replies!: ArticleCommentReplyDto[];
}

export class ArticleDetailDto extends OmitType(ArticleDto, [
  'author',
] as const) {
  @ApiProperty({ example: false })
  isLiked!: boolean;

  @ApiProperty({ example: false })
  isMine!: boolean;

  @ApiProperty({ type: ArticleDetailAuthorDto, nullable: true })
  author!: ArticleDetailAuthorDto | null;

  @ApiProperty({ type: [ArticleCommentDto] })
  comments!: ArticleCommentDto[];

  @ApiProperty({ example: '2026-05-01T14:30:00.000Z', nullable: true })
  updatedAt!: string | null;
}

export class UpdateArticleResponseDto {
  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: '2026-05-01T15:00:00.000Z' })
  updatedAt!: string;
}

export class PinArticleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPinned!: boolean;
}

export class PinArticleResponseDto {
  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: true })
  isPinned!: boolean;

  @ApiProperty({ example: '2026-05-01T17:40:00.000Z' })
  updatedAt!: string;
}

export class DeleteArticleResponseDto {
  @ApiProperty({ example: 1 })
  articleId!: number;

  @ApiProperty({ example: '2026-05-01T15:10:00.000Z' })
  deletedAt!: string;
}

export class LikeArticleResponseDto {
  @ApiProperty({ example: 10 })
  articleId!: number;

  @ApiProperty({ example: true })
  isLiked!: boolean;

  @ApiProperty({ example: 27 })
  likeCount!: number;
}
