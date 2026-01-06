import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { HeartService } from '../../services/heart/heart.service';
import {
  HeartListPayload,
  HeartReceivedItem,
  HeartSentItem,
} from '../../dtos/heart.dto';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_CODE } from '../../../../common/errors/error-codes';

@Controller('hearts')
export class HeartController {
  public constructor(private readonly heartService: HeartService) {}

  @Get('received')
  public async getReceived(
    @Query('userId') userIdQuery?: string,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ): Promise<HeartListPayload<HeartReceivedItem>> {
    if (!userIdQuery)
      throw new AppException(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODE.COMMON_BAD_REQUEST,
        message: 'userId query parameter is required',
      });
    return this.heartService.getReceivedHearts({
      userId: userIdQuery,
      cursor,
      size,
      path: '/api/v1/hearts/received',
    });
  }

  @Get('sent')
  public async getSent(
    @Query('userId') userIdQuery?: string,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ): Promise<HeartListPayload<HeartSentItem>> {
    if (!userIdQuery) {
      throw new AppException(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODE.COMMON_BAD_REQUEST,
        message: 'userId query parameter is required',
      });
    }
    return this.heartService.getSentHearts({
      userId: userIdQuery,
      cursor,
      size,
      path: '/api/v1/hearts/sent',
    });
  }
}
