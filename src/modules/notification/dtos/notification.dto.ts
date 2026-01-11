import { Notification } from '@prisma/client';
import { IsString, IsBoolean } from 'class-validator';


export class NotificationResponseDto {
  @IsString()
  notificationId: string;
  @IsString()
  type: string;
  @IsBoolean()
  isRead: boolean;
  @IsString()
  createdAt: string;
  @IsString()
  title: string;
  @IsString()
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
