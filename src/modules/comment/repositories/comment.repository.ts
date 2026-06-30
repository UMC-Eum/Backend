import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findArticleByClubId(clubId: bigint, articleId: bigint) {
    return this.prisma.article.findFirst({
      where: {
        id: articleId,
        clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            nickname: true,
          },
        },
      },
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
        userId: true,
        user: {
          select: {
            nickname: true,
          },
        },
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
        parentCommentId: true,
        depth: true,
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
        OR: [
          { deletedAt: null },
          {
            replies: {
              some: {
                deletedAt: null,
              },
            },
          },
        ],
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
        AND: [
          {
            OR: [
              { deletedAt: null },
              {
                replies: {
                  some: {
                    deletedAt: null,
                  },
                },
              },
            ],
          },
          ...(params.cursor
            ? [
                {
                  OR: [
                    { createdAt: { lt: params.cursor.createdAt } },
                    {
                      createdAt: params.cursor.createdAt,
                      id: { lt: params.cursor.id },
                    },
                  ],
                },
              ]
            : []),
        ],
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

  existsActiveReply(parentCommentId: bigint) {
    return this.prisma.comment.findFirst({
      where: {
        parentCommentId,
        deletedAt: null,
      },
      select: { id: true },
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

  softDeleteParentCommentWithReplies(commentId: bigint, deletedAt: Date) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        contents: '(삭제된 댓글입니다)',
        userId: null,
        deletedAt,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  }
}
