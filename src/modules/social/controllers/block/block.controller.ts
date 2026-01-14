import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BlockService } from '../../services/block/block.service';
import { BlockDto } from '../../dtos/block.dto';
import { RequiredUserId } from '../../../auth/decorators';

@ApiTags('Block')
@ApiBearerAuth()
@Controller('block')
export class BlockController {
  public constructor(private readonly blockService: BlockService) {}

  @Post()
  @ApiOperation({
    summary: '사용자 차단',
    description: '현재 로그인한 사용자가 다른 사용자를 차단합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', example: '42' },
        reason: {
          type: 'string',
          example: '불쾌한 메시지',
        },
      },
      required: ['targetUserId', 'reason'],
    },
  })
  @ApiOkResponse({
    description: '차단 성공',
    schema: {
      type: 'object',
      properties: {
        blockId: { type: 'number', example: 1 },
        status: { type: 'string', example: 'BLOCKED' },
        blockedAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  public async blockUser(
    @RequiredUserId() userId: number,
    @Body() req: { targetUserId: string; reason: string },
  ): Promise<BlockDto> {
    return this.blockService.createBlock(
      String(userId),
      req.targetUserId,
      req.reason,
    );
  }

  @Get()
  @ApiOperation({ summary: '차단 목록 조회' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '다음 페이지 커서',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '페이지 크기 (최대 50)',
  })
  @ApiOkResponse({
    description: '차단 목록',
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
              blockId: { type: 'number', example: 10 },
              targetUserId: { type: 'number', example: 5 },
              reason: { type: 'string', example: '스팸 메시지' },
              status: { type: 'string', example: 'BLOCKED' },
              blockedAt: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
    },
  })
  async getBlockedUsers(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.blockService.getBlock({
      userId: String(userId),
      cursor,
      size,
      path: '/api/v1/block',
    });
  }

  @Patch(':blockId')
  @ApiOperation({ summary: '차단 해제' })
  @ApiOkResponse({ description: '차단 해제 완료' })
  @ApiBadRequestResponse({ description: '잘못된 blockId' })
  public async unblockUser(@Query('blockId') blockId: string) {
    return this.blockService.unActivateBlock(blockId);
  }
}
