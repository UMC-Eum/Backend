import { Body, Controller, Get, Param, Patch, Post, Req, Query } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { UpdateNotificationDto } from '../dtos/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() dto: any) {
    return this.notificationService.create(dto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Get()
  findAll( @Req() req, @Query('cursor') cursor?: string, @Query('size') size?: string) {
    const limit = size ? Number(size) : 20;
    return this.notificationService.findAll(req.user.id, cursor, limit);
  }
  @Patch()
  update(@Body() dto: UpdateNotificationDto) {
    return this.notificationService.update(dto);
  }
}
