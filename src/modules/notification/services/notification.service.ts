import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationResponseDto, UpdateNotificationDto, CreateNotificationDto } from '../dtos/notification.dto';

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

  async findAll( userId: number, cursor?: string, limit = 20, ) {
  const result = await this.notificationRepository.findAll( userId, cursor, limit,);

  return result.map(NotificationResponseDto.from); 
  }

  update(dto: UpdateNotificationDto) {
    return this.notificationRepository.update(dto);
  }
}
