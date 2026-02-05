import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { BlockDto, BlockListItem, BlockListPayload } from '../dtos/block.dto';
import { AppException } from '../../../common/errors/app.exception';
import { BlockStatus } from '@prisma/client';
import { ERROR_DEFINITIONS } from '../../../common/errors/error-codes';

@Injectable()
export class BlockRepository {
  private readonly logger = new Logger(BlockRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    return BigInt(value);
  }

  private parseSize(size?: string): number {
    const parsed = Number(size ?? 20);
    if (Number.isNaN(parsed)) return 20;
    return Math.min(Math.max(parsed, 1), 50);
  }

  async createBlock(
    userId: string,
    blockedUserId: string,
    reason: string,
  ): Promise<BlockDto | null> {
    const blockedById = BigInt(userId);
    const blockedId = BigInt(blockedUserId);
    this.logger.debug(
      `createBlock blockedById=${blockedById} blockedId=${blockedId}`,
    );
    if (
      (await this.prisma.user.findUnique({ where: { id: blockedId } })) == null
    ) {
      return null;
    }
    const exist = await this.prisma.block.findUnique({
      where: {
        blockedById_blockedId: { blockedById, blockedId },
      },
      select: { id: true, status: true, blockedAt: true },
    });
    // UNBLOCKED 상태인 경우 다시 BLOCKED로 업데이트
    if (exist != null && exist.status === BlockStatus.UNBLOCKED) {
      const existResult = await this.prisma.block.update({
        where: {
          blockedById_blockedId: { blockedById, blockedId },
        },
        data: {
          status: BlockStatus.BLOCKED,
          blockedAt: new Date(),
          reason: reason,
        },
      });
      return {
        blockId: Number(existResult.id),
        status: existResult.status,
        blockedAt: existResult.blockedAt.toISOString(),
      };
    }
    //존재하고, 차단되어있는 상태에서는 존재하는 값 리턴.
    if (exist != null && exist.status === BlockStatus.BLOCKED)
      return {
        blockId: 0,
        status: exist.status,
        blockedAt: exist.blockedAt.toISOString(),
      };
    // 존재하지 않는 경우 새로 생성
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

  private async findBlocksWithCursor(params: {
    userId: bigint;
    cursor?: string;
    size?: string;
  }): Promise<BlockListPayload> {
    const take = this.parseSize(params.size);
    let parsedCursor: bigint | undefined;

    if (params.cursor) {
      try {
        parsedCursor = this.toBigInt(params.cursor);
      } catch {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: ERROR_DEFINITIONS.VALIDATION_REQUIRED_FIELD_MISSING.message,
          details: { field: 'cursor' },
        });
      }
    }

    const blocks = await this.prisma.block.findMany({
      where: {
        blockedById: params.userId,
        status: BlockStatus.BLOCKED,
        deletedAt: null,
      },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(parsedCursor ? { cursor: { id: parsedCursor }, skip: 1 } : {}),
    });

    this.logger.debug(
      `findBlocksWithCursor fetched=${blocks.length} take=${take} cursor=${parsedCursor}`,
    );

    const hasNext = blocks.length > take;
    const items = hasNext ? blocks.slice(0, take) : blocks;
    const nextCursor =
      hasNext && items.length ? items[items.length - 1].id.toString() : null;

    const mappedItems: BlockListItem[] = items.map((item) => ({
      blockId: Number(item.id),
      status: item.status,
      blockedAt: item.blockedAt.toISOString(),
      targetUserId: Number(item.blockedId),
      reason: item.reason,
    }));

    return { nextCursor, items: mappedItems };
  }

  async patchBlock(blockId: string): Promise<BlockDto | null> {
    if (
      (await this.prisma.block.findFirst({
        where: { id: Number(blockId), status: BlockStatus.BLOCKED },
      })) == null
    ) {
      return null;
    }

    const response = await this.prisma.block.update({
      where: { id: Number(blockId) },
      data: { status: BlockStatus.UNBLOCKED, blockedAt: new Date() },
    });

    return {
      blockId: Number(response.id),
      status: response.status,
      blockedAt: response.blockedAt.toISOString(),
    };
  }

  async getBlock(params: {
    userId: string;
    cursor?: string;
    size?: string;
  }): Promise<BlockListPayload | null> {
    const userId = this.toBigInt(params.userId);
    this.logger.debug(
      `getBlock userId=${userId} cursor=${params.cursor} size=${params.size}`,
    );
    if (
      (await this.prisma.block.findMany({ where: { blockedId: userId } })) ==
      null
    ) {
      return null;
    }
    return this.findBlocksWithCursor({
      userId,
      cursor: params.cursor,
      size: params.size,
    });
  }
}
