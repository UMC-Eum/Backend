import { Injectable } from '@nestjs/common';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from '../dtos/notification.dto';

@Injectable()
export class NotificationRepository {
  create(dto: CreateNotificationDto) {
    return dto;
  }

  markAsRead(id: string) {
    return { id, read: true };
  }

  findAll() {
    return [];
  }

  update(dto: UpdateNotificationDto) {
    return dto;
  }
}
