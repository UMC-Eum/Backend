import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationResponseDto } from '../dtos/notification.dto';

@Injectable()
export class NotificationService {
  constructor( private readonly notificationRepository: NotificationRepository, ) {}


  async markAsRead(id: string) {
    await this.notificationRepository.markAsRead(id);
  }

  async findAll( userId: number, cursor?: string, limit = 20, ) {
    const result = await this.notificationRepository.findAll( userId, cursor, limit +1,);
    // TODO: nextCursor 추가
    const hasNext = result.length > limit;
    const items = hasNext? result.slice(0, limit) : result;
    const nextCursor = hasNext ? items[items.length-1].id : null;

    return { nextCursor: Number(nextCursor), items: items.map(NotificationResponseDto.from) }; 
  }

}
