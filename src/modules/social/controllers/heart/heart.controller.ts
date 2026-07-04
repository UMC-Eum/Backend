import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { HeartService } from '../../services/heart/heart.service';
import {
  CreateHeartRequestDto,
  HeartListPayload,
  HeartReceivedItem,
  HeartSentItem,
} from '../../dtos/heart.dto';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { BlockFilterInterceptor } from '../../../../common/interceptors/block-filter.interceptor';

@ApiTags('Heart')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('hearts')
export class HeartController {
  public constructor(private readonly heartService: HeartService) {}

  @Post()
  @ApiOperation({ summary: '하트 보내기' })
  @ApiBody({
    type: CreateHeartRequestDto,
  })
  @ApiOkResponse({
    description: '하트 전송 결과',
    schema: {
      type: 'object',
      properties: {
        heartId: { type: 'number', example: 101 },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  public async postHeart(
    @RequiredUserId() userId: number,
    @Body() dto: CreateHeartRequestDto,
  ) {
    return this.heartService.createHeart(String(userId), dto.targetUserId);
  }

  @Patch(':heartId')
  @ApiOperation({ summary: '보낸 하트 비활성화' })
  @ApiOkResponse({ description: '상태 변경 완료' })
  @ApiBadRequestResponse({ description: '잘못된 heartId' })
  public async unActivateHeart(
    @Param('heartId', ParseIntPipe) heartId: number,
  ) {
    return this.heartService.patchHeart(heartId);
  }

  @Get('received')
  @ApiOperation({ summary: '받은 하트 목록' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '페이지 크기 (최대 50)',
  })
  @ApiOkResponse({
    description: '받은 하트 목록',
    schema: {
      type: 'object',
      properties: {
        nextCursor: {
          type: 'string',
          nullable: true,
          example: 'opaque_cursor',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heartId: { type: 'number', example: 201 },
              fromUserId: { type: 'number', nullable: true, example: 9 },
              createdAt: { type: 'string', format: 'date-time' },
              fromUser: {
                type: 'object',
                properties: {
                  profileImageUrl: {
                    type: 'string',
                    nullable: true,
                    example: 'https://example.com/profile.jpg',
                  },
                  nickname: { type: 'string', example: '사용자123' },
                  age: { type: 'number', example: 25 },
                },
                description:
                  '유저가 삭제되어 Heart.sentById가 null이면 nickname은 "삭제된 사용자", id는 0으로 반환됩니다.',
              },
            },
          },
        },
      },
    },
  })
  @UseInterceptors(BlockFilterInterceptor)
  public async getReceived(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ): Promise<HeartListPayload<HeartReceivedItem>> {
    return this.heartService.getReceivedHearts({
      userId: String(userId),
      cursor,
      size,
      path: '/api/v1/hearts/received',
    });
  }

  @Get('sent')
  @ApiOperation({ summary: '보낸 하트 목록' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '페이지 크기 (최대 50)',
  })
  @ApiOkResponse({
    description: '보낸 하트 목록',
    schema: {
      type: 'object',
      properties: {
        nextCursor: { type: 'string', nullable: true },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heartId: { type: 'number', example: 301 },
              targetUserId: { type: 'number', nullable: true, example: 12 },
              createdAt: { type: 'string', format: 'date-time' },
              targetUser: {
                type: 'object',
                properties: {
                  profileImageUrl: {
                    type: 'string',
                    nullable: true,
                    example: 'https://example.com/profile.jpg',
                  },
                  nickname: { type: 'string', example: '사용자456' },
                  age: { type: 'number', example: 27 },
                },
                description:
                  '유저가 삭제되어 Heart.sentToId가 null이면 nickname은 "삭제된 사용자", id는 0으로 반환됩니다.',
              },
            },
          },
        },
      },
    },
  })
  @UseInterceptors(BlockFilterInterceptor)
  public async getSent(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ): Promise<HeartListPayload<HeartSentItem>> {
    return this.heartService.getSentHearts({
      userId: String(userId),
      cursor,
      size,
      path: '/api/v1/hearts/sent',
    });
  }
}
