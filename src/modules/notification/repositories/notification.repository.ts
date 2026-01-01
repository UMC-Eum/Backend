import { Injectable } from '@nestjs/common';
import { Prisma, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    const data: Prisma.NotificationUncheckedCreateInput = {
      userId: BigInt(dto.userId),
      type: dto.type ?? NotificationType.CHAT,
      isRead: dto.isRead ?? false,
      title: dto.title,
      body: dto.body,
    };

    return this.prisma.notification.create({ data });
  }

  findById(id: bigint) {
    return this.prisma.notification.findFirst({ where: { id, deletedAt: null } });
  }

  findMany(query: QueryNotificationDto) {
    const { page = 1, limit = 20, userId, type, isRead } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = { deletedAt: null };

    if (typeof userId === 'number') where.userId = BigInt(userId);
    if (type) where.type = type;
    if (typeof isRead === 'boolean') where.isRead = isRead;

    return this.prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: bigint, dto: UpdateNotificationDto) {
    const data: Prisma.NotificationUncheckedUpdateInput = {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.body ? { body: dto.body } : {}),
      ...(typeof dto.isRead === 'boolean' ? { isRead: dto.isRead } : {}),
      ...(dto.type ? { type: dto.type } : {}),
    };

    return this.prisma.notification.update({ where: { id }, data });
  }

  softDelete(id: bigint) {
    return this.prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  markAsRead(id: bigint) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  markAllRead(userId: bigint, type?: NotificationType) {
    return this.prisma.notification.updateMany({
      where: { userId, deletedAt: null, isRead: false, ...(type ? { type } : {}) },
      data: { isRead: true },
    });
  }
}
