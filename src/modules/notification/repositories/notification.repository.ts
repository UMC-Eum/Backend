import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { NotificationType, ActiveStatus } from '@prisma/client';

export type ArticleNotificationTarget = {
  clubId: bigint;
  articleId: bigint;
};

export type CommentNotificationTarget = ArticleNotificationTarget & {
  commentId: bigint;
};

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // PATCH v1/notifications/{notificationId}/read
  async markAsRead(id: string) {
    await this.prisma.notification.update({
      where: { id: Number(id) },
      data: {
        isRead: true,
      },
    });
  }
  findNotificationById(id: string, userId: number) {
    return this.prisma.notification.findUnique({
      where: {
        id: Number(id),
        userId,
      },
    });
  }

  // GET v1/notifications
  findAll(userId: number, cursor?: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      take: limit,
      ...(cursor && {
        cursor: { id: BigInt(cursor) },
        skip: 1,
      }),
      orderBy: { id: 'desc' },
    });
  }

  // 알림 생성 로직
  // param: userId,type,isRead,createdAt,deletedAt,title,body
  createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    sentById?: number,
  ) {
    return this.prisma.notification.create({
      data: {
        userId: BigInt(userId),
        type: type,
        title: title,
        body: body,
        ...(sentById !== undefined && { sentById: BigInt(sentById) }),
      },
    });
  }

  // GET v1/notifications/hearts & GET v1/notifications/chats
  findNotificationByFilter(
    userId: number,
    type: NotificationType,
    cursor?: string,
    limit = 20,
  ) {
    return this.prisma.notification.findMany({
      where: {
        userId: BigInt(userId),
        type: type,
      },
      take: limit,
      ...(cursor && {
        cursor: { id: BigInt(cursor) },
        skip: 1,
      }),
      orderBy: { id: 'desc' },
    });
  }

  findClubNotifications(userId: number, cursor?: bigint, limit = 20) {
    return this.prisma.notification.findMany({
      where: {
        userId: BigInt(userId),
        type: { in: [NotificationType.ARTICLE, NotificationType.COMMENT] },
        deletedAt: null,
      },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { id: 'desc' },
      include: {
        sentBy: true,
      },
    });
  }

  async findArticleNotificationTarget(params: {
    receiverUserId: bigint;
    senderUserId: bigint;
    notificationCreatedAt: Date;
  }): Promise<ArticleNotificationTarget | null> {
    const like = await this.prisma.articleLike.findFirst({
      where: {
        userId: params.senderUserId,
        createdAt: { lte: params.notificationCreatedAt },
        article: {
          userId: params.receiverUserId,
          deletedAt: null,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        articleId: true,
        article: {
          select: {
            clubId: true,
          },
        },
      },
    });

    return like
      ? {
          clubId: like.article.clubId,
          articleId: like.articleId,
        }
      : null;
  }

  async findCommentNotificationTarget(params: {
    receiverUserId: bigint;
    senderUserId: bigint;
    notificationCreatedAt: Date;
  }): Promise<CommentNotificationTarget | null> {
    const comment = await this.prisma.comment.findFirst({
      where: {
        userId: params.senderUserId,
        createdAt: { lte: params.notificationCreatedAt },
        deletedAt: null,
        OR: [
          {
            article: {
              userId: params.receiverUserId,
              deletedAt: null,
            },
          },
          {
            parentComment: {
              userId: params.receiverUserId,
              deletedAt: null,
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        articleId: true,
        article: {
          select: {
            clubId: true,
          },
        },
      },
    });

    return comment
      ? {
          clubId: comment.article.clubId,
          articleId: comment.articleId,
          commentId: comment.id,
        }
      : null;
  }

  // DELETE v1/notifications/{notificationId}
  deleteNotificationById(userId: number, notificationId: string) {
    return this.prisma.notification.delete({
      where: {
        userId: BigInt(userId),
        id: BigInt(notificationId),
      },
    });
  }
  // 마음 알림->프로필 연결
  findHeartNotifications(userId: number, cursor?: string, take = 20) {
    return this.prisma.notification.findMany({
      where: {
        userId: BigInt(userId),
        type: NotificationType.HEART,
      },
      orderBy: { id: 'desc' },
      take,
      ...(cursor && {
        cursor: { id: BigInt(cursor) },
        skip: 1,
      }),

      include: {
        sentBy: {
          where: { status: ActiveStatus.ACTIVE },
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  // 마음 알림 전체 읽음
  readAllHeartNotifications(userId: number) {
    return this.prisma.notification.updateMany({
      data: {
        isRead: true,
      },
      where: {
        userId: BigInt(userId),
        isRead: false,
        type: NotificationType.HEART,
      },
    });
  }
}
