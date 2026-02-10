import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationResponseDto } from '../dtos/notification.dto';
import { AppException } from '../../../common/errors/app.exception';
import { NotificationType } from '@prisma/client';
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async markAsRead(id: string, userId: number) {
    const notification = await this.notificationRepository.findNotificationById(
      id,
      userId,
    );
    if (!notification) {
      throw new AppException('NOTI_DOESNOT_EXIST');
    }
    await this.notificationRepository.markAsRead(id);
  }

  async findAll(userId: number, cursor?: string, limit = 20) {
    const result = await this.notificationRepository.findAll(
      userId,
      cursor,
      limit + 1,
    );
    const hasNext = result.length > limit;
    const items = hasNext ? result.slice(0, limit) : result;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return {
      nextCursor: nextCursor !== null ? Number(nextCursor) : null,
      items: items.map((item) => NotificationResponseDto.from(item)),
    };
  }

  async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const result = await this.notificationRepository.createNotification(
      userId,
      type,
      title,
      body,
    );
    return result;
  }

  async findNotificationByFilter(
    userId: number,
    type: NotificationType,
    cursor?: string,
    limit = 20,
  ) {
    const result = await this.notificationRepository.findNotificationByFilter(
      userId,
      type,
      cursor,
      limit + 1,
    );
    const hasNext = result.length > limit;
    const items = hasNext ? result.slice(0, limit) : result;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return {
      nextCursor: nextCursor !== null ? Number(nextCursor) : null,
      items: items.map((item) => NotificationResponseDto.from(item)),
    };
  }

  async deleteNotificationById(userId: number, notificationId: string) {
    const notification = await this.notificationRepository.findNotificationById(
      notificationId,
      userId,
    );
    if (!notification) {
      throw new AppException('NOTI_DOESNOT_EXIST');
    }
    await this.notificationRepository.deleteNotificationById(
      userId,
      notificationId,
    );
  }
}
