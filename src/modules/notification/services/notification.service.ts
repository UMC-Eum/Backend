import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from '../dtos/notification.dto';
import { NotificationResponseDto } from '../dtos/notification.dto';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  create(dto: CreateNotificationDto) {
    return this.notificationRepository.create(dto);
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

  findAll() {
    return this.notificationRepository.findAll();
  }

  update(dto: UpdateNotificationDto) {
    return this.notificationRepository.update(dto);
    return {
      nextCursor: nextCursor !== null ? Number(nextCursor) : null,
      items: items.map((item) => NotificationResponseDto.from(item)),
    };
  }
}
