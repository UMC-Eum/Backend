import { Notification } from '@prisma/client';

export class CreateNotificationDto {
  title: string;
  message: string;
}

export class UpdateNotificationDto {
  title?: string;
  message?: string;
  read?: boolean;
}

export class NotificationResponseDto {
  id: string;
  userId: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  deletedAt: string | null;
  title: string;
  body: string;

  static from(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id.toString(),
      userId: entity.userId.toString(),
      type: entity.type,
      isRead: entity.isRead,
      createdAt: entity.createdAt.toISOString(),
      deletedAt: entity.deletedAt ? entity.deletedAt.toISOString() : null,
      title: entity.title,
      body: entity.body,
    };  
  };
}

