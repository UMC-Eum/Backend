import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationRepository } from './repositories/notification.repository';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  create(createNotificationDto: CreateNotificationDto) {
    return this.notificationRepository.create(createNotificationDto);
  }

  findAll(query: QueryNotificationDto) {
    return this.notificationRepository.findMany(query);
  }

  async findOne(id: number) {
    const notification = await this.notificationRepository.findById(BigInt(id));
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return this.notificationRepository.update(BigInt(id), updateNotificationDto);
  }

  remove(id: number) {
    return this.notificationRepository.softDelete(BigInt(id));
  }

  markAsRead(id: number) {
    return this.notificationRepository.markAsRead(BigInt(id));
  }

  markAllRead(userId: number) {
    return this.notificationRepository.markAllRead(BigInt(userId));
  }
}
