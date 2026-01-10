import { Notification } from '@prisma/client';



export class NotificationResponseDto {
  notificationId: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  title: string;
  body: string;

  static from(entity: Notification): NotificationResponseDto {
    return {
      notificationId: entity.id.toString(),
      type: entity.type,
      title: entity.title,
      body: entity.body,
      isRead: entity.isRead,
      createdAt: entity.createdAt.toISOString(),
    };  
  };
}
