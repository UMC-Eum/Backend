import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

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
}
