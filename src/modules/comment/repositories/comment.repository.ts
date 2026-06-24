import { Injectable } from '@nestjs/common';
import { ClubUserStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClubById(clubId: bigint) {
    return this.prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  }

  findArticleByClubId(clubId: bigint, articleId: bigint) {
    return this.prisma.article.findFirst({
      where: {
        id: articleId,
        clubId,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  findActiveClubUser(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId,
        status: ClubUserStatus.ACTIVE,
        leftAt: null,
      },
      select: { id: true },
    });
  }

  findParentComment(articleId: bigint, parentCommentId: bigint) {
    return this.prisma.comment.findFirst({
      where: {
        id: parentCommentId,
        articleId,
        deletedAt: null,
      },
      select: {
        id: true,
        depth: true,
      },
    });
  }

  findCommentByArticleId(articleId: bigint, commentId: bigint) {
    return this.prisma.comment.findFirst({
      where: {
        id: commentId,
        articleId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  createComment(data: Prisma.CommentUncheckedCreateInput) {
    return this.prisma.comment.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  countComments(articleId: bigint) {
    return this.prisma.comment.count({
      where: {
        articleId,
        deletedAt: null,
      },
    });
  }

  findCommentCursor(articleId: bigint, commentId: bigint) {
    return this.prisma.comment.findFirst({
      where: {
        id: commentId,
        articleId,
        parentCommentId: null,
        depth: 0,
        deletedAt: null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
  }

  findCommentsWithReplies(params: {
    clubId: bigint;
    articleId: bigint;
    limit: number;
    cursor?: { id: bigint; createdAt: Date };
  }) {
    return this.prisma.comment.findMany({
      where: {
        articleId: params.articleId,
        parentCommentId: null,
        depth: 0,
        deletedAt: null,
        ...(params.cursor && {
          OR: [
            { createdAt: { lt: params.cursor.createdAt } },
            {
              createdAt: params.cursor.createdAt,
              id: { lt: params.cursor.id },
            },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
            clubUsers: {
              where: { clubId: params.clubId },
              select: { authority: true },
              take: 1,
            },
          },
        },
        replies: {
          where: {
            depth: 1,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImageUrl: true,
                clubUsers: {
                  where: { clubId: params.clubId },
                  select: { authority: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  softDeleteComment(commentId: bigint, deletedAt: Date) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  }
}
