import { Injectable, Logger } from '@nestjs/common';
import { ActiveStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AppException } from '../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../common/errors/error-codes';

@Injectable()
export class HeartRepository {
  private readonly logger = new Logger(HeartRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    return BigInt(value);
  }

  async postHeart(
    sentById: string | number | bigint,
    sentToId: string | number | bigint,
  ) {
    const payload = {
      sentById: this.toBigInt(sentById),
      sentToId: this.toBigInt(sentToId),
    };
    this.logger.debug(
      `postHeart sentById=${payload.sentById} sentToId=${payload.sentToId}`,
    );
    const targetUser = await this.prisma.user.findUnique({
      where: { id: payload.sentToId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
        message: ERROR_DEFINITIONS.SOCIAL_TARGET_USER_NOT_FOUND.message,
        details: { targetUserId: payload.sentToId.toString() },
      });
    }
    const response = await this.prisma.heart.create({ data: payload });
    return {
      heartId: Number(response.id),
      createdAt: response.createdAt.toISOString(),
    };
  }

  async patchHeart(heartId: number) {
    const updated = await this.prisma.heart.update({
      where: { id: BigInt(heartId) },
      data: {
        status: ActiveStatus.INACTIVE,
      },
    });

    return {
      heartId: Number(updated.id),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  private async findHeartsWithCursor(params: {
    where: Prisma.HeartWhereInput;
    cursor?: string;
    size?: number;
  }) {
    const take = Math.min(Math.max(params.size ?? 20, 1), 50);
    let parsedCursor: bigint | undefined;
    if (params.cursor !== undefined) {
      try {
        parsedCursor = this.toBigInt(params.cursor);
      } catch {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: ERROR_DEFINITIONS.VALIDATION_REQUIRED_FIELD_MISSING.message,
          details: { field: 'cursor' },
        });
      }
    }

    const hearts = await this.prisma.heart.findMany({
      where: params.where,
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(parsedCursor ? { cursor: { id: parsedCursor }, skip: 1 } : {}),
    });

    this.logger.debug(
      `findHeartsWithCursor fetched=${hearts.length} take=${take} cursor=${parsedCursor}`,
    );

    const hasNext = hearts.length > take;
    const items = hasNext ? hearts.slice(0, take) : hearts;
    const nextCursor =
      hasNext && items.length ? items[items.length - 1].id.toString() : null;

    this.logger.debug(
      `findHeartsWithCursor returning count=${items.length} nextCursor=${nextCursor}`,
    );

    return { items, nextCursor };
  }

  async getReceivedHeartsByUserId(params: {
    userId: string | number | bigint;
    cursor?: string;
    size?: number;
  }) {
    const sentToId = this.toBigInt(params.userId);
    this.logger.debug(
      `getReceivedHeartsByUserId userId=${sentToId} cursor=${params.cursor} size=${params.size}`,
    );
    return this.findHeartsWithCursor({
      where: { sentToId, status: ActiveStatus.ACTIVE, deletedAt: null },
      cursor: params.cursor,
      size: params.size,
    });
  }

  async getSentHeartsByUserId(params: {
    userId: string | number | bigint;
    cursor?: string;
    size?: number;
  }) {
    const sentById = this.toBigInt(params.userId);
    this.logger.debug(
      `getSentHeartsByUserId userId=${sentById} cursor=${params.cursor} size=${params.size}`,
    );
    return this.findHeartsWithCursor({
      where: { sentById, status: ActiveStatus.ACTIVE, deletedAt: null },
      cursor: params.cursor,
      size: params.size,
    });
  }
}
