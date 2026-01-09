import { Body, Controller, Get, Param, Patch, Post, Req, Query } from '@nestjs/common';
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
// AUTH가 구현되면 사용할 코드
  /*@Get()
  
  findAll( @Req() req, @Query('cursor') cursor?: string, @Query('size') size?: string) {
    const limit = size ? Number(size) : 20;
    return this.notificationService.findAll(req.user.id, cursor, limit);
  }*/
 // AUTH구현되기 전 임시 코드
 @Get()
  findAll(
  @Body('userId') userId: number,
  @Query('cursor') cursor?: string,
  @Query('size') size?: string,
  ) {
  return this.notificationService.findAll(
    userId,
    cursor,
    size ? Number(size) : 20,
  );
}

  @Patch()
  update(@Body() dto: UpdateNotificationDto) {
    return this.notificationService.update(dto);
  }
}
