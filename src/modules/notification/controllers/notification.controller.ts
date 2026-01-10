import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';




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
          data : {}
        },
        error: null,
        meta: {
          timestamp: '2025-12-30T04:10:00.000Z',
          path: '/api/v1/notifications/1/read',
        }
      }
    }
  })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationService.markAsRead(id);
  }
 // AUTH가 구현되면 사용할 코드
  /*@Get()
  
  findAll( @Req() req, @Query('cursor') cursor?: string, @Query('size') size?: string) {
    const limit = size ? Number(size) : 20;
    return this.notificationService.findAll(req.user.id, cursor, limit);
  }*/
 // AUTH구현되기 전 임시 코드
 @ApiOperation({ summary: '알림 목록 조회 '})
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
          data : {
            notificationId: 1,
            type: 'RECOMMEND',
            title: '새로운 추천이 도착했어요',
            body: '회원님과 잘 맞는 추천을 확인해 보세요.',
            isRead: false,
            createdAt: '2025-12-30T04:10:00.000Z',
          }
        },
        error: null,
        meta: {
          timestamp: '2025-12-30T04:10:00.000Z',
          path: '/api/v1/notifications/1/read',
        }
      }
    }
  })
 @Get()
  findAll(@Query('cursor') cursor?: string, @Query('size') size?: string,) {
  // 추후 삭제 예정(AUTH 구현 전 테스트용)
  const userId = 2;
  return this.notificationService.findAll(
    userId,
    cursor,
    size ? Number(size) : 20,
  );
}

}
