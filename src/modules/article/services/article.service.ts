import { Injectable } from '@nestjs/common';
import { ClubAuthority } from '@prisma/client';
import {
  ArticleDetailResult,
  ArticleRepository,
} from '../repositories/article.repository';
import { CreateArticleDto } from '../dtos/create-article.dto';
import {
  ArticleCommentDto,
  ArticleCommentReplyDto,
  ArticleDetailAuthorDto,
  ArticleDetailDto,
  ArticleDto,
  DeleteArticleResponseDto,
  LikeArticleResponseDto,
  UpdateArticleResponseDto,
} from '../dtos/article.dto';
import { ListArticlesQueryDto } from '../dtos/list-articles-query.dto';
import { AppException } from '../../../common/errors/app.exception';
import { UpdateArticleDto } from '../dtos/update-article.dto';

type ArticleEntity = Awaited<ReturnType<ArticleRepository['createArticle']>>;

@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async findClubArticles(
    clubId: number,
    query: ListArticlesQueryDto,
  ): Promise<ArticleDto[]> {
    await this.ensureClubExists(clubId);

    const result = await this.articleRepository.findArticlesByClub(clubId, {
      category: query.category,
      sort: query.sort ?? 'recent',
      cursor: this.normalizeCursor(query.cursor),
      take: query.limit ?? 20,
    });

    return result.map((article) => this.toArticleDto(article));
  }

  async createArticle(
    userId: number,
    clubId: number,
    createArticleDto: CreateArticleDto,
  ): Promise<ArticleDto> {
    await this.ensureClubExists(clubId);

    const result = await this.articleRepository.createArticle(
      userId,
      clubId,
      createArticleDto.title,
      createArticleDto.contents,
      createArticleDto.category,
      createArticleDto.photoUrls,
    );

    return this.toArticleDto(result);
  }

  async findArticleDetail(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<ArticleDetailDto> {
    const result = await this.articleRepository.findArticleDetail(
      userId,
      clubId,
      articleId,
    );

    if (!result) {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    return this.toArticleDetailDto(result, userId);
  }

  async updateArticle(
    userId: number,
    clubId: number,
    articleId: number,
    updateArticleDto: UpdateArticleDto,
  ): Promise<UpdateArticleResponseDto> {
    const result = await this.articleRepository.updateArticle(
      userId,
      clubId,
      articleId,
      updateArticleDto,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    if (result.status === 'forbidden') {
      throw new AppException('ARTICLE_FORBIDDEN');
    }

    return {
      articleId: Number(result.article.id),
      updatedAt: result.article.updatedAt.toISOString(),
    };
  }

  async deleteArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<DeleteArticleResponseDto> {
    const result = await this.articleRepository.deleteArticle(
      userId,
      clubId,
      articleId,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    if (result.status === 'forbidden') {
      throw new AppException('ARTICLE_FORBIDDEN');
    }

    return {
      articleId: Number(result.article.id),
      deletedAt: result.article.deletedAt.toISOString(),
    };
  }

  async likeArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<LikeArticleResponseDto> {
    const result = await this.articleRepository.likeArticle(
      userId,
      clubId,
      articleId,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    return {
      articleId: Number(result.article.id),
      isLiked: true,
      likeCount: result.article.likes,
    };
  }

  async unlikeArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<LikeArticleResponseDto> {
    const result = await this.articleRepository.unlikeArticle(
      userId,
      clubId,
      articleId,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    return {
      articleId: Number(result.article.id),
      isLiked: false,
      likeCount: result.article.likes,
    };
  }

  private async ensureClubExists(clubId: number): Promise<void> {
    const exists = await this.articleRepository.existsClub(clubId);

    if (!exists) {
      throw new AppException('ARTICLE_CLUB_NOT_FOUND');
    }
  }

  private normalizeCursor(cursor?: string): bigint | undefined {
    if (!cursor || cursor === '0') {
      return undefined;
    }

    const parsedCursor = BigInt(cursor);
    return parsedCursor > 0n ? parsedCursor : undefined;
  }

  private toArticleDto(article: ArticleEntity): ArticleDto {
    return {
      articleId: Number(article.id),
      clubId: Number(article.clubId),
      title: article.title,
      contents: article.contents,
      category: article.category,
      isPinned: article.isPinned,
      viewCount: article.view,
      likeCount: article.likes,
      commentCount: article._count.comments,
      author: article.user
        ? {
            userId: Number(article.user.id),
            nickname: article.user.nickname,
            profileImageUrl: article.user.profileImageUrl,
          }
        : null,
      photos: article.articlePhotos.map((photo) => ({
        photoId: Number(photo.id),
        photoUrl: photo.photoUrl,
      })),
      createdAt: article.createdAt.toISOString(),
    };
  }

  private toArticleDetailDto(
    result: ArticleDetailResult,
    userId: number,
  ): ArticleDetailDto {
    const { article, authorAuthorities } = result;
    const comments = this.toArticleComments(
      article.comments,
      authorAuthorities,
      userId,
    );

    return {
      articleId: Number(article.id),
      clubId: Number(article.clubId),
      title: article.title,
      contents: article.contents,
      category: article.category,
      isPinned: article.isPinned,
      viewCount: article.view,
      likeCount: article.likes,
      commentCount: article.comments.length,
      isLiked: article.articleLikes.length > 0,
      isMine: article.userId === BigInt(userId),
      author: this.toDetailAuthor(article.user, authorAuthorities),
      photos: article.articlePhotos.map((photo) => ({
        photoId: Number(photo.id),
        photoUrl: photo.photoUrl,
      })),
      comments,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt?.toISOString() ?? null,
    };
  }

  private toArticleComments(
    comments: ArticleDetailResult['article']['comments'],
    authorAuthorities: ArticleDetailResult['authorAuthorities'],
    userId: number,
  ): ArticleCommentDto[] {
    const repliesByParentId = new Map<string, ArticleCommentReplyDto[]>();
    const roots: ArticleCommentDto[] = [];

    for (const comment of comments) {
      const mapped = {
        commentId: Number(comment.id),
        parentCommentId:
          comment.parentCommentId === null
            ? null
            : Number(comment.parentCommentId),
        depth: comment.depth,
        contents: comment.contents,
        isMine: comment.userId === BigInt(userId),
        author: this.toDetailAuthor(comment.user, authorAuthorities),
        createdAt: comment.createdAt.toISOString(),
      };

      if (comment.parentCommentId === null) {
        roots.push({ ...mapped, replies: [] });
        continue;
      }

      const parentId = comment.parentCommentId.toString();
      const replies = repliesByParentId.get(parentId) ?? [];
      replies.push(mapped);
      repliesByParentId.set(parentId, replies);
    }

    return roots.map((comment) => ({
      ...comment,
      replies: repliesByParentId.get(String(comment.commentId)) ?? [],
    }));
  }

  private toDetailAuthor(
    user: { id: bigint; nickname: string; profileImageUrl: string } | null,
    authorAuthorities: ArticleDetailResult['authorAuthorities'],
  ): ArticleDetailAuthorDto | null {
    if (!user) {
      return null;
    }

    return {
      userId: Number(user.id),
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      authority:
        authorAuthorities.get(user.id.toString()) ?? ClubAuthority.GENERAL,
    };
  }
}
