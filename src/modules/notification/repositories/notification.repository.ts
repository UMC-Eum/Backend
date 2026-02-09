import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

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
  ) {
    return this.prisma.notification.create({
      data: {
        userId: BigInt(userId),
        type: type,
        title: title,
        body: body,
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

  // DELETE v1/notifications/{notificationId}
  deleteNotificationById(userId: number, notificationId: string) {
    return this.prisma.notification.delete({
      where: {
        userId: BigInt(userId),
        id: BigInt(notificationId),
      },
    });
  }
}
