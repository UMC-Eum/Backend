import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationResponseDto,
  NotificationTargetDto,
  NotificationWithSenderResponseDto,
} from '../dtos/notification.dto';
import { AppException } from '../../../common/errors/app.exception';
import { NotificationType } from '@prisma/client';
import {
  decodeCursorRaw,
  encodeCursor,
} from '../../../common/utils/cursor.util';
import { FcmPushService } from '../../push/services/fcm-push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly fcmPushService: FcmPushService,
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
    sentById?: number,
  ) {
    const result = await this.notificationRepository.createNotification(
      userId,
      type,
      title,
      body,
      sentById,
    );

    try {
      await this.fcmPushService.sendNotificationToUser(userId, result);
    } catch (e) {
      this.logger.warn(
        `FCM push failed notificationId=${result.id.toString()} userId=${userId}: ${String(e)}`,
      );
    }

    return result;
  }

  async findNotificationByFilter(
    userId: number,
    type: NotificationType,
    cursor?: string,
    limit = 20,
  ) {
    if (type == NotificationType.HEART) {
      const result = await this.notificationRepository.findHeartNotifications(
        userId,
        cursor,
        limit + 1,
      );
      const hasNext = result.length > limit;
      const items = hasNext ? result.slice(0, limit) : result;
      const nextCursor = hasNext ? items[items.length - 1].id : null;
      return {
        nextCursor: nextCursor !== null ? Number(nextCursor) : null,
        items: result.map((item) =>
          NotificationWithSenderResponseDto.from(item),
        ),
      };
    }
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

  async findClubNotifications(userId: number, cursor?: string, limit = 20) {
    const cursorId = cursor ? this.decodeNotificationCursor(cursor) : undefined;
    const result = await this.notificationRepository.findClubNotifications(
      userId,
      cursorId,
      limit + 1,
    );
    const hasNext = result.length > limit;
    const items = hasNext ? result.slice(0, limit) : result;
    const last = items.at(-1);

    const mappedItems = await Promise.all(
      items.map(async (item) =>
        NotificationWithSenderResponseDto.from(
          item,
          await this.findClubNotificationTarget(item),
        ),
      ),
    );

    return {
      nextCursor:
        hasNext && last ? encodeCursor({ id: last.id.toString() }) : null,
      items: mappedItems,
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

  async readAllHeartNotifications(userId: number) {
    await this.notificationRepository.readAllHeartNotifications(userId);
  }

  async readAllClubNotifications(userId: number) {
    await this.notificationRepository.readAllClubNotifications(userId);
  }

  private decodeNotificationCursor(cursor: string): bigint {
    const parsed = decodeCursorRaw(cursor);
    const id = parsed.id;

    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'cursor 형식이 올바르지 않습니다.',
      });
    }

    try {
      const cursorId = BigInt(id);
      if (cursorId <= 0n) {
        throw new Error('cursor id must be positive');
      }
      return cursorId;
    } catch {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'cursor 형식이 올바르지 않습니다.',
      });
    }
  }

  private async findClubNotificationTarget(notification: {
    userId: bigint;
    type: NotificationType;
    createdAt: Date;
    sentById: bigint | null;
  }): Promise<NotificationTargetDto | undefined> {
    if (!notification.sentById) {
      return undefined;
    }

    const params = {
      receiverUserId: notification.userId,
      senderUserId: notification.sentById,
      notificationCreatedAt: notification.createdAt,
    };

    const target =
      notification.type === NotificationType.ARTICLE
        ? await this.notificationRepository.findArticleNotificationTarget(
            params,
          )
        : notification.type === NotificationType.COMMENT
          ? await this.notificationRepository.findCommentNotificationTarget(
              params,
            )
          : null;

    if (!target) {
      return undefined;
    }

    const commentId = (target as { commentId?: bigint }).commentId;
    if (commentId) {
      return {
        clubId: target.clubId.toString(),
        articleId: target.articleId.toString(),
        commentId: commentId.toString(),
      };
    }

    return {
      clubId: target.clubId.toString(),
      articleId: target.articleId.toString(),
    };
  }
}
