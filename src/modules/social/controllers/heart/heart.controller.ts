import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HeartService } from '../../services/heart/heart.service';
import {
  HeartListPayload,
  HeartReceivedItem,
  HeartSentItem,
} from '../../dtos/heart.dto';
import { RequiredUserId } from '../../../auth/decorators';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';

@Controller('hearts')
export class HeartController {
  public constructor(private readonly heartService: HeartService) {}

  @Post()
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
  public async unActivateHeart(
    @Param('heartId', ParseIntPipe) heartId: number,
  ) {
    return this.heartService.patchHeart(heartId);
  }

  @Get('received')
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
