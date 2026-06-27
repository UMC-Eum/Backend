import { Injectable } from '@nestjs/common';
import { ClubAuthority, NotificationType } from '@prisma/client';
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
  PinArticleDto,
  PinArticleResponseDto,
  ArticleListItemDto,
  ListArticlesResponseDto,
} from '../dtos/article.dto';
import { ListArticlesQueryDto } from '../dtos/list-articles-query.dto';
import { AppException } from '../../../common/errors/app.exception';
import { UpdateArticleDto } from '../dtos/update-article.dto';
import { NotificationService } from '../../notification/services/notification.service';

type ArticleEntity = Awaited<ReturnType<ArticleRepository['createArticle']>>;

@Injectable()
export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async findClubArticles(
    clubId: number,
    query: ListArticlesQueryDto,
  ): Promise<ListArticlesResponseDto> {
    await this.ensureClubExists(clubId);

    const take = query.limit ?? 20;
    const result = await this.articleRepository.findArticlesByClub(clubId, {
      category: query.category,
      sort: query.sort ?? 'recent',
      cursor: this.normalizeCursor(query.cursor),
      take: take + 1, // fetch one extra to detect hasMore
    });

    const hasMore = result.length > take;
    const items = hasMore ? result.slice(0, take) : result;

    const articles = items.map((article) => {
      const firstPhoto = article.articlePhotos[0];
      const previewMax = 120;
      const rawPreview = article.contents ?? '';
      const preview = rawPreview.length > previewMax ? rawPreview.slice(0, previewMax).trim() + '...' : rawPreview;

      return {
        articleId: Number(article.id),
        title: article.title,
        preview,
        category: article.category,
        isPinned: article.isPinned,
        viewCount: article.view,
        likeCount: article.likes,
        commentCount: article._count.comments,
        thumbnailUrl: firstPhoto ? firstPhoto.photoUrl : null,
        author: article.user
          ? {
              userId: Number(article.user.id),
              nickname: article.user.nickname,
              profileImageUrl: article.user.profileImageUrl,
            }
          : null,
        createdAt: article.createdAt.toISOString(),
      } as ArticleListItemDto;
    });

    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ id: String(items[items.length - 1].id) })).toString('base64')
      : null;

    return {
      clubId,
      articles,
      nextCursor,
      hasMore,
    };
  }

  async createArticle(
    userId: number,
    clubId: number,
    createArticleDto: CreateArticleDto,
  ): Promise<ArticleDto> {
    await this.ensureClubExists(clubId);
    await this.ensureClubMember(userId, clubId);

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
    await this.ensureClubExists(clubId);
    await this.ensureClubMember(userId, clubId);

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

  async pinArticle(
    userId: number,
    clubId: number,
    articleId: number,
    pinArticleDto: PinArticleDto,
  ): Promise<PinArticleResponseDto> {
    const result = await this.articleRepository.pinArticle(
      userId,
      clubId,
      articleId,
      pinArticleDto.isPinned,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    if (result.status === 'forbidden') {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    return {
      articleId: Number(result.article.id),
      isPinned: result.article.isPinned,
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
    await this.ensureClubExists(clubId);
    await this.ensureClubMember(userId, clubId);

    const result = await this.articleRepository.likeArticle(
      userId,
      clubId,
      articleId,
    );

    if (result.status === 'not_found') {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    await this.createArticleLikeNotification(userId, result);

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
    await this.ensureClubExists(clubId);
    await this.ensureClubMember(userId, clubId);

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
      throw new AppException('CLUB_NOT_FOUND');
    }
  }

  private async ensureClubMember(
    userId: number,
    clubId: number,
  ): Promise<void> {
    const exists = await this.articleRepository.existsActiveClubUser(
      userId,
      clubId,
    );

    if (!exists) {
      throw new AppException('ARTICLE_MEMBER_ONLY');
    }
  }

  private normalizeCursor(cursor?: string): bigint | undefined {
    if (!cursor || cursor === '0') {
      return undefined;
    }

    try {
      // Base64 디코딩 시도
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      const id = BigInt(parsed.id);
      return id > 0n ? id : undefined;
    } catch {
      // 디코딩 실패 시 (호환성) 직접 숫자 파싱 시도
      try {
        const id = BigInt(cursor);
        return id > 0n ? id : undefined;
      } catch {
        return undefined;
      }
    }
  }

  private async createArticleLikeNotification(
    senderId: number,
    result: Extract<
      Awaited<ReturnType<ArticleRepository['likeArticle']>>,
      { status: 'success' }
    >,
  ): Promise<void> {
    const authorId = result.article.userId;

    if (!result.created || authorId === null || authorId === BigInt(senderId)) {
      return;
    }

    const senderNickname = result.sender?.nickname ?? '알 수 없는 사용자';
    const receiverNickname = result.article.user?.nickname ?? '알 수 없는 사용자';

    await this.notificationService.createNotification(
      Number(authorId),
      NotificationType.ARTICLE,
      '게시글에 좋아요가 눌렸어요.',
      `${senderNickname}님이 ${receiverNickname}님의 게시물을 좋아합니다.`,
      senderId,
    );
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

  async findArchivePhotos(
    clubId: number,
    query: ListArticlesQueryDto,
  ): Promise<{ items: { photoId: number; articleId: number; photoUrl: string; createdAt: string }[]; nextCursor: string | null; hasMore: boolean }> {
    await this.ensureClubExists(clubId);

    const take = query.limit ?? 20;
    const result = await this.articleRepository.findArchivePhotos(clubId, {
      sort: query.sort ?? 'recent',
      cursor: this.normalizeCursor(query.cursor),
      take: take + 1, // fetch one extra to detect hasMore
    });

    const hasMore = result.length > take;
    const items = hasMore ? result.slice(0, take) : result;

    const photos = items.map((photo) => ({
      photoId: Number(photo.id),
      articleId: Number(photo.articleId),
      photoUrl: photo.photoUrl,
      createdAt: photo.createdAt.toISOString(),
    }));

    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ id: String(items[items.length - 1].id) })).toString('base64')
      : null;

    return {
      items: photos,
      nextCursor,
      hasMore,
    };
  }
}
