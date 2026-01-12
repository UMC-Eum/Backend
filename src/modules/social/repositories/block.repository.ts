import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { BlockDto } from '../dtos/block.dto';

@Injectable()
export class BlockRepository {
  private readonly logger = new Logger(BlockRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBlock(
    userId: string,
    blockedUserId: string,
    reason: string,
  ): Promise<BlockDto> {
    const blockedById = BigInt(userId);
    const blockedId = BigInt(blockedUserId);
    this.logger.debug(
      `createBlock blockedById=${blockedById} blockedId=${blockedId}`,
    );

    const created = await this.prisma.block.create({
      data: {
        blockedById,
        blockedId,
        reason,
        blockedAt: new Date(),
      },
    });

    return {
      blockId: Number(created.id),
      status: created.status,
      blockedAt: created.blockedAt.toISOString(),
    };
  }

  async patchBlock(blockId: string): Promise<BlockDto> {
    const response = await this.prisma.block.update({
      where: { id: Number(blockId) },
      data: { status: 'UNBLOCKED' },
    });

    return {
      blockId: Number(response.id),
      status: response.status,
      blockedAt: response.blockedAt.toISOString(),
    };
  }
}
