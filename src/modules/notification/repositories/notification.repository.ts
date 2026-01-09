import { Injectable } from '@nestjs/common';
import {
  CreateNotificationDto, UpdateNotificationDto,
} from '../dtos/notification.dto';
import { PrismaService } from 'src/infra/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    return dto;
  }

  markAsRead(id: string) {
    return { id, read: true };
  }

  // v1/notifications에 사용될 리포지토리 함수.
  findAll( userId: number, cursor?: string, limit = 20,) {
  return this.prisma.notification.findMany({
    where: { userId },
    take: limit,
    ...(cursor && {
      cursor: { id: BigInt(cursor) },
      skip: 1,
    }),
    orderBy: { id: 'desc' },
  });
}


  update(dto: UpdateNotificationDto) {
    return dto;
  }
}
