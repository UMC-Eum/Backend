import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from '../dtos/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  create(dto: CreateNotificationDto) {
    return this.notificationRepository.create(dto);
  }

  markAsRead(id: string) {
    return this.notificationRepository.markAsRead(id);
  }

  findAll() {
    return this.notificationRepository.findAll();
  }

  update(dto: UpdateNotificationDto) {
    return this.notificationRepository.update(dto);
  }
}
