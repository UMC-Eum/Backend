import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { BlockService } from '../../services/block/block.service';
import { BlockDto } from '../../dtos/block.dto';

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
  public async getBlockedUsers() {}

  @Patch(':blockId')
  public async unblockUser(@Query('blockId') blockId: string) {
    return this.blockService.unActivateBlock(blockId);
  }
}
