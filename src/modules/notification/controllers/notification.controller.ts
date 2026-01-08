import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from '../dtos/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }
  @Patch()
  update(@Body() dto: UpdateNotificationDto) {
    return this.notificationService.update(dto);
  }
}
