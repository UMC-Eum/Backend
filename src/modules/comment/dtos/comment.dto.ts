import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ClubAuthority, Prisma } from '@prisma/client';

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        nickname: true;
        profileImageUrl: true;
      };
    };
  };
}>;

export class CreateCommentRequestDto {
  @ApiProperty({ example: '공감 가는 글이네요 :)' })
  @IsString()
  @IsNotEmpty()
  contents!: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description: '대댓글이면 부모 댓글 id, 일반 댓글이면 null',
  })
  @ValidateIf((dto: CreateCommentRequestDto) => dto.parentCommentId !== null)
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsInt()
  @Min(1)
  parentCommentId!: number | null;
}

export class CommentAuthorDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '달콤한목소리' })
  nickname!: string;

  @ApiProperty({ example: 'https://cdn.example.com/profile/42.jpg' })
  profileImageUrl!: string;
}

export class CreateCommentResponseDto {
  @ApiProperty({ example: 555 })
  commentId!: number;

  @ApiProperty({ example: 1024 })
  articleId!: number;

  @ApiProperty({ example: null, nullable: true })
  parentCommentId!: number | null;

  @ApiProperty({ example: 0 })
  depth!: number;

  @ApiProperty({ example: '공감 가는 글이네요 :)' })
  contents!: string;

  @ApiProperty({ type: CommentAuthorDto })
  author!: CommentAuthorDto | null;

  @ApiProperty({ example: '2026-05-01T15:20:00.000Z' })
  createdAt!: string;

  static from(entity: CommentWithAuthor): CreateCommentResponseDto {
    return {
      commentId: Number(entity.id),
      articleId: Number(entity.articleId),
      parentCommentId:
        entity.parentCommentId === null ? null : Number(entity.parentCommentId),
      depth: entity.depth,
      contents: entity.contents,
      author: entity.user
        ? {
            userId: Number(entity.user.id),
            nickname: entity.user.nickname,
            profileImageUrl: entity.user.profileImageUrl,
          }
        : null,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}

export class ListCommentsQueryDto {
  @ApiProperty({
    required: false,
    example: 'eyJpZCI6NTU0fQ==',
    description: '이전 응답의 nextCursor',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    example: 20,
    description: '가져올 댓글 개수. 기본 20, 최대 100',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CommentListAuthorDto {
  @ApiProperty({ example: 7 })
  userId!: number;

  @ApiProperty({ example: '보이스마스터' })
  nickname!: string;

  @ApiProperty({ example: 'https://cdn.example.com/profile/7.jpg' })
  profileImageUrl!: string;

  @ApiProperty({ enum: ClubAuthority, example: ClubAuthority.HOST })
  authority!: ClubAuthority;
}

export class CommentReplyResponseDto {
  @ApiProperty({ example: 556 })
  commentId!: number;

  @ApiProperty({ example: 555 })
  parentCommentId!: number;

  @ApiProperty({ example: 1 })
  depth!: number;

  @ApiProperty({ example: '감사합니다!' })
  contents!: string;

  @ApiProperty({ example: true })
  isMine!: boolean;

  @ApiProperty({ type: CommentListAuthorDto })
  author!: CommentListAuthorDto | null;

  @ApiProperty({ example: '2026-05-01T15:25:00.000Z' })
  createdAt!: string;
}

export class CommentListItemResponseDto {
  @ApiProperty({ example: 555 })
  commentId!: number;

  @ApiProperty({ example: null, nullable: true })
  parentCommentId!: number | null;

  @ApiProperty({ example: 0 })
  depth!: number;

  @ApiProperty({ example: '공감 가는 글이네요 :)' })
  contents!: string;

  @ApiProperty({ example: false })
  isMine!: boolean;

  @ApiProperty({ type: CommentListAuthorDto })
  author!: CommentListAuthorDto | null;

  @ApiProperty({ example: '2026-05-01T15:20:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: [CommentReplyResponseDto] })
  replies!: CommentReplyResponseDto[];
}

export class ListCommentsResponseDto {
  @ApiProperty({ example: 1024 })
  articleId!: number;

  @ApiProperty({ example: 8 })
  totalCount!: number;

  @ApiProperty({ type: [CommentListItemResponseDto] })
  comments!: CommentListItemResponseDto[];

  @ApiProperty({ example: 'eyJpZCI6NTU0fQ==', nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class DeleteCommentResponseDto {
  @ApiProperty({ example: 555 })
  commentId!: number;

  @ApiProperty({ example: '2026-05-01T15:25:00.000Z' })
  deletedAt!: string;
}
