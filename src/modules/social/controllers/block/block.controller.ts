import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BlockService } from '../../services/block/block.service';
import { BlockDto } from '../../dtos/block.dto';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_CODE } from '../../../../common/errors/error-codes';

@Controller('block')
export class BlockController {
  public constructor(private readonly blockService: BlockService) {}

  @Post()
  public async blockUser(
    @Query('userId') userId: string,
    @Body() req: { targetUserId: string; reason: string },
  ): Promise<BlockDto> {
    return this.blockService.createBlock(userId, req.targetUserId, req.reason);
  }

  @Get()
  public async getBlockedUsers(
    @Query('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    if (!userId) {
      throw new AppException(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODE.COMMON_BAD_REQUEST,
        message: 'userId query parameter is required',
      });
    }
    return this.blockService.getBlock({
      userId,
      cursor,
      size,
      path: '/api/v1/block',
    });
  }

  @Patch(':blockId')
  public async unblockUser(@Query('blockId') blockId: string) {
    return this.blockService.unActivateBlock(blockId);
  }
}
