import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import {
  CommentListAuthorDto,
  CommentListItemResponseDto,
  CommentReplyResponseDto,
  CreateCommentRequestDto,
  CreateCommentResponseDto,
  DeleteCommentResponseDto,
  ListCommentsQueryDto,
  ListCommentsResponseDto,
} from '../dtos/comment.dto';
import { CommentRepository } from '../repositories/comment.repository';

type CommentListEntity = Awaited<
  ReturnType<CommentRepository['findCommentsWithReplies']>
>[number];
type CommentReplyEntity = CommentListEntity['replies'][number];

@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: CommentRepository) {}

  async createComment(
    userId: number,
    clubId: number,
    articleId: number,
    dto: CreateCommentRequestDto,
  ): Promise<CreateCommentResponseDto> {
    const club = await this.commentRepository.findClubById(BigInt(clubId));

    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const article = await this.commentRepository.findArticleByClubId(
      BigInt(clubId),
      BigInt(articleId),
    );

    if (!article) {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    const clubUser = await this.commentRepository.findActiveClubUser(
      BigInt(clubId),
      BigInt(userId),
    );

    if (!clubUser) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    const parentComment = dto.parentCommentId
      ? await this.commentRepository.findParentComment(
          BigInt(articleId),
          BigInt(dto.parentCommentId),
        )
      : null;

    if (dto.parentCommentId && !parentComment) {
      throw new AppException('COMMENT_PARENT_NOT_FOUND');
    }

    if (parentComment && parentComment.depth >= 1) {
      throw new AppException('COMMENT_DEPTH_EXCEEDED');
    }

    const comment = await this.commentRepository.createComment({
      articleId: BigInt(articleId),
      userId: BigInt(userId),
      contents: dto.contents,
      parentCommentId:
        dto.parentCommentId === null ? null : BigInt(dto.parentCommentId),
      depth: parentComment ? parentComment.depth + 1 : 0,
    });

    return CreateCommentResponseDto.from(comment);
  }

  async listComments(
    userId: number,
    clubId: number,
    articleId: number,
    query: ListCommentsQueryDto,
  ): Promise<ListCommentsResponseDto> {
    await this.validateReadableArticle(userId, clubId, articleId);

    const limit = query.limit ?? 20;
    const cursorId = query.cursor ? this.decodeCursor(query.cursor) : null;
    const cursor = cursorId
      ? await this.commentRepository.findCommentCursor(
          BigInt(articleId),
          BigInt(cursorId),
        )
      : null;

    if (query.cursor && !cursor) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        details: { field: 'cursor' },
      });
    }

    const [totalCount, comments] = await Promise.all([
      this.commentRepository.countComments(BigInt(articleId)),
      this.commentRepository.findCommentsWithReplies({
        clubId: BigInt(clubId),
        articleId: BigInt(articleId),
        limit,
        cursor: cursor ?? undefined,
      }),
    ]);

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const last = items[items.length - 1];

    return {
      articleId,
      totalCount,
      comments: items.map((comment) => this.toCommentItem(comment, userId)),
      nextCursor: hasMore && last ? this.encodeCursor(Number(last.id)) : null,
      hasMore,
    };
  }

  async deleteComment(
    userId: number,
    clubId: number,
    articleId: number,
    commentId: number,
  ): Promise<DeleteCommentResponseDto> {
    await this.validateArticleExists(clubId, articleId);

    const comment = await this.commentRepository.findCommentByArticleId(
      BigInt(articleId),
      BigInt(commentId),
    );

    if (!comment) {
      throw new AppException('COMMENT_NOT_FOUND');
    }

    if (comment.userId === null || Number(comment.userId) !== userId) {
      throw new AppException('COMMENT_FORBIDDEN_NOT_AUTHOR');
    }

    const deletedAt = new Date();
    const deleted = await this.commentRepository.softDeleteComment(
      BigInt(commentId),
      deletedAt,
    );

    return {
      commentId: Number(deleted.id),
      deletedAt: deleted.deletedAt?.toISOString() ?? deletedAt.toISOString(),
    };
  }

  private async validateReadableArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ) {
    await this.validateArticleExists(clubId, articleId);

    const clubUser = await this.commentRepository.findActiveClubUser(
      BigInt(clubId),
      BigInt(userId),
    );

    if (!clubUser) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }
  }

  private async validateArticleExists(
    clubId: number,
    articleId: number,
  ): Promise<void> {
    const club = await this.commentRepository.findClubById(BigInt(clubId));

    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const article = await this.commentRepository.findArticleByClubId(
      BigInt(clubId),
      BigInt(articleId),
    );

    if (!article) {
      throw new AppException('ARTICLE_NOT_FOUND');
    }
  }

  private toCommentItem(
    comment: CommentListEntity,
    userId: number,
  ): CommentListItemResponseDto {
    return {
      commentId: Number(comment.id),
      parentCommentId: null,
      depth: comment.depth,
      contents: comment.contents,
      isMine: comment.userId !== null && Number(comment.userId) === userId,
      author: this.toAuthor(comment.user),
      createdAt: comment.createdAt.toISOString(),
      replies: comment.replies.map((reply) => this.toReply(reply, userId)),
    };
  }

  private toReply(
    reply: CommentReplyEntity,
    userId: number,
  ): CommentReplyResponseDto {
    return {
      commentId: Number(reply.id),
      parentCommentId: Number(reply.parentCommentId),
      depth: reply.depth,
      contents: reply.contents,
      isMine: reply.userId !== null && Number(reply.userId) === userId,
      author: this.toAuthor(reply.user),
      createdAt: reply.createdAt.toISOString(),
    };
  }

  private toAuthor(
    user: CommentListEntity['user'],
  ): CommentListAuthorDto | null {
    if (!user) {
      return null;
    }

    const clubUser = user.clubUsers[0];

    return {
      userId: Number(user.id),
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      authority: clubUser.authority,
    };
  }

  private encodeCursor(commentId: number): string {
    return Buffer.from(JSON.stringify({ id: commentId }), 'utf8').toString(
      'base64',
    );
  }

  private decodeCursor(cursor: string): number {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      const id = Number(decoded?.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('invalid cursor id');
      }

      return id;
    } catch {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        details: { field: 'cursor' },
      });
    }
  }
}
