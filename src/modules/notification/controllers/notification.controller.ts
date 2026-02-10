import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RequiredUserId } from '../../../modules/auth/decorators';
import { AccessTokenGuard } from '../../../modules/auth/guards/access-token.guard';
import { NotificationResponseDto } from '../dtos/notification.dto';
import { NotificationType } from '@prisma/client';

@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiParam({
    name: 'id',
    description: '알림ID',
    example: 1,
  })
  @ApiResponse({
    description: '알림 읽음 처리 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {},
        },
        error: null,
        meta: {
          timestamp: '2025-12-30T04:10:00.000Z',

          path: '/api/v1/notifications/1/read',
        },
      },
    },
  })
  @Patch(':id/read')
  @UseGuards(AccessTokenGuard)
  async markAsRead(@Param('id') id: string, @RequiredUserId() userId: number) {
    await this.notificationService.markAsRead(id, userId);
  }

  @ApiOperation({ summary: '알림 목록 조회 ' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '한 페이지당 보여줄 알림 개수',
    example: 20,
  })
  @ApiResponse({
    description: '알림 읽음 처리 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            nextCursor: null,
            items: {
              notificationId: 1,
              type: 'RECOMMEND',
              title: '새로운 추천이 도착했어요',
              body: '회원님과 잘 맞는 추천을 확인해 보세요.',
              isRead: false,
              createdAt: '2025-12-30T04:10:00.000Z',
            },
          },
        },
        error: null,
        meta: {
          timestamp: '2025-12-30T04:10:00.000Z',
          path: '/api/v1/notifications/1/read',
        },
      },
    },
  })
  @Get()
  @UseGuards(AccessTokenGuard)
  findAll(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.notificationService.findAll(
      userId,
      cursor,
      size ? Number(size) : 20,
    );
  }

  @ApiOperation({ description: '마음 알림 목록 조회' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '한 페이지당 보여줄 알림 개수',
    example: 20,
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  @Get('hearts')
  @UseGuards(AccessTokenGuard)
  findHeartNotifications(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.notificationService.findNotificationByFilter(
      userId,
      NotificationType.HEART,
      cursor,
      size ? Number(size) : 20,
    );
  }

  @ApiOperation({ description: '채팅 알림 목록 조회' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '한 페이지당 보여줄 알림 개수',
    example: 20,
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  @Get('chats')
  @UseGuards(AccessTokenGuard)
  findChatNotifications(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.notificationService.findNotificationByFilter(
      userId,
      NotificationType.CHAT,
      cursor,
      size ? Number(size) : 20,
    );
  }

  @ApiOperation({ description: '특정 알림 삭제' })
  @ApiParam({
    name: 'id',
    description: '알림ID',
    example: 1,
  })
  @ApiOkResponse()
  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async deleteNotificationById(
    @RequiredUserId() userId: number,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.deleteNotificationById(
      userId,
      notificationId,
    );
  }
}
