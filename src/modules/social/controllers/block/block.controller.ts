import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { BlockService } from '../../services/block/block.service';
import { BlockDto } from '../../dtos/block.dto';
import { RequiredUserId } from '../../../auth/decorators';

@Controller('block')
export class BlockController {
  public constructor(private readonly blockService: BlockService) {}

  @Post()
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
  public async unblockUser(@Query('blockId') blockId: string) {
    return this.blockService.unActivateBlock(blockId);
  }
}
