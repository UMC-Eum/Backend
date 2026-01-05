import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ActiveStatus, Heart, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class HeartRepository {
  private readonly logger = new Logger(HeartRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    return BigInt(value);
  }

  private encodeCursor(heart: Heart) {
    return Buffer.from(JSON.stringify({ id: heart.id.toString() })).toString(
      'base64',
    );
  }

  private decodeCursor(cursor: string) {
    this.logger.debug(`decodeCursor cursor=${cursor}`);
    try {
      const payload = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf8'),
      ) as { id: string };
      const decoded = { id: BigInt(payload.id) };
      this.logger.debug(`decodeCursor result=${payload.id}`);
      return decoded;
    } catch {
      throw new AppException(HttpStatus.BAD_REQUEST, {
        code: 'COMMON_BAD_REQUEST',
        message: 'Invalid cursor',
      });
    }
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
    return this.prisma.heart.create({ data: payload });
  }

  async patchHeart(
    sentById: string | number | bigint,
    sentToId: string | number | bigint,
    status: ActiveStatus = ActiveStatus.INACTIVE,
  ) {
    const where = {
      sentById_sentToId: {
        sentById: this.toBigInt(sentById),
        sentToId: this.toBigInt(sentToId),
      },
    } satisfies Prisma.HeartWhereUniqueInput;

    this.logger.debug(
      `patchHeart sentById=${where.sentById_sentToId.sentById} sentToId=${where.sentById_sentToId.sentToId} status=${status}`,
    );

    return this.prisma.heart.update({
      where,
      data: {
        status,
      },
    });
  }

  private async findHeartsWithCursor(params: {
    where: Prisma.HeartWhereInput;
    cursor?: string;
    size?: number;
  }) {
    const take = Math.min(Math.max(params.size ?? 20, 1), 50);
    const decodedCursor = params.cursor
      ? this.decodeCursor(params.cursor)
      : undefined;

    const hearts = await this.prisma.heart.findMany({
      where: params.where,
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(decodedCursor ? { cursor: decodedCursor, skip: 1 } : {}),
    });

    this.logger.debug(
      `findHeartsWithCursor fetched=${hearts.length} take=${take} decodedCursor=${decodedCursor?.id}`,
    );

    const hasNext = hearts.length > take;
    const items = hasNext ? hearts.slice(0, take) : hearts;
    const nextCursor =
      hasNext && items.length
        ? this.encodeCursor(items[items.length - 1])
        : null;

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
