import { Injectable, Logger } from '@nestjs/common';
import { ActiveStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AppException } from '../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../common/errors/error-codes';
import { HeartItemBase, HeartListPayload } from '../dtos/heart.dto';

// Repository 레이어에서 반환하는 기본 타입 (프로필 정보 없음)
type HeartSentItemBase = {
  heartId: number;
  createdAt: string;
  targetUserId: number;
};

type HeartReceivedItemBase = {
  heartId: number;
  createdAt: string;
  fromUserId: number;
};

type PostHeartResult =
  | { ok: true; heart: HeartItemBase }
  | { ok: false; reason: 'TARGET_NOT_FOUND' | 'ALREADY_EXISTS' };

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
  ): Promise<PostHeartResult> {
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
      return { ok: false, reason: 'TARGET_NOT_FOUND' };
    }
    const exist = await this.prisma.heart.findFirst({
      where: {
        sentById: payload.sentById,
        sentToId: payload.sentToId,
        status: ActiveStatus.ACTIVE,
      },
    });
    if (exist != null) {
      return { ok: false, reason: 'ALREADY_EXISTS' };
    }
    const inactiveExist = await this.prisma.heart.findFirst({
      where: {
        sentById: payload.sentById,
        sentToId: payload.sentToId,
        status: ActiveStatus.INACTIVE,
      },
    });
    if (inactiveExist != null) {
      await this.prisma.heart.update({
        where: { id: inactiveExist.id },
        data: { status: ActiveStatus.ACTIVE },
      });
      return {
        ok: true,
        heart: {
          heartId: Number(inactiveExist.id),
          createdAt: inactiveExist.createdAt.toISOString(),
        },
      };
    }
    const response = await this.prisma.heart.create({ data: payload });
    return {
      ok: true,
      heart: {
        heartId: Number(response.id),
        createdAt: response.createdAt.toISOString(),
      },
    };
  }

  async patchHeart(heartId: number): Promise<HeartItemBase | null> {
    if (
      !(await this.prisma.heart.findFirst({
        where: { id: BigInt(heartId), status: ActiveStatus.ACTIVE },
      }))
    ) {
      return null;
    }
    this.logger.debug(`patchHeart heartId=${heartId}`);
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
    isSent: boolean;
  }): Promise<HeartListPayload<
    HeartSentItemBase | HeartReceivedItemBase
  > | null> {
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
    if (hearts.length === 0) return null;

    const hasNext = hearts.length > take;
    const items = hasNext ? hearts.slice(0, take) : hearts;
    const nextCursor =
      hasNext && items.length ? items[items.length - 1].id.toString() : null;

    this.logger.debug(
      `findHeartsWithCursor returning count=${items.length} nextCursor=${nextCursor}`,
    );

    if (params.isSent) {
      const mappedItems: HeartSentItemBase[] = items.map((item) => ({
        heartId: Number(item.id),
        createdAt: item.createdAt.toISOString(),
        targetUserId: Number(item.sentToId),
      }));
      return { nextCursor, items: mappedItems };
    } else {
      const mappedItems: HeartReceivedItemBase[] = items.map((item) => ({
        heartId: Number(item.id),
        createdAt: item.createdAt.toISOString(),
        fromUserId: Number(item.sentById),
      }));
      return { nextCursor, items: mappedItems };
    }
  }

  async getReceivedHeartsByUserId(params: {
    userId: string | number | bigint;
    cursor?: string;
    size?: number;
  }): Promise<HeartListPayload<HeartReceivedItemBase> | null> {
    const sentToId = this.toBigInt(params.userId);
    this.logger.debug(
      `getReceivedHeartsByUserId userId=${sentToId} cursor=${params.cursor} size=${params.size}`,
    );
    const result = await this.findHeartsWithCursor({
      where: { sentToId, status: ActiveStatus.ACTIVE, deletedAt: null },
      cursor: params.cursor,
      size: params.size,
      isSent: false,
    });
    if (result == null) {
      return null;
    } else return result as HeartListPayload<HeartReceivedItemBase>;
  }

  async getSentHeartsByUserId(params: {
    userId: string | number | bigint;
    cursor?: string;
    size?: number;
  }): Promise<HeartListPayload<HeartSentItemBase> | null> {
    const sentById = this.toBigInt(params.userId);
    this.logger.debug(
      `getSentHeartsByUserId userId=${sentById} cursor=${params.cursor} size=${params.size}`,
    );
    const result = await this.findHeartsWithCursor({
      where: { sentById, status: ActiveStatus.ACTIVE, deletedAt: null },
      cursor: params.cursor,
      size: params.size,
      isSent: true,
    });
    if (result == null) {
      return null;
    } else {
      return result as HeartListPayload<HeartSentItemBase>;
    }
  }
}
