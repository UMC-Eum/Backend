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
  HeartListPayload,
  HeartReceivedItem,
  HeartSentItem,
} from '../../dtos/heart.dto';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';
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
    schema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', example: '24' },
      },
      required: ['targetUserId'],
    },
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
    @Body('targetUserId') targetUserId?: string,
  ) {
    if (!targetUserId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: ERROR_DEFINITIONS.VALIDATION_INVALID_FORMAT.message,
        details: {
          field: 'targetUserId',
        },
      });
    }
    return this.heartService.createHeart(String(userId), targetUserId);
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
              fromUserId: { type: 'number', example: 9 },
              createdAt: { type: 'string', format: 'date-time' },
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
              targetUserId: { type: 'number', example: 12 },
              createdAt: { type: 'string', format: 'date-time' },
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
