import { Injectable, Logger } from '@nestjs/common';
import { HeartRepository } from '../../repositories/heart.repository';
import {
  HeartReceivedItem,
  HeartSentItem,
  HeartListPayload,
  HeartItemBase,
} from '../../dtos/heart.dto';

interface PaginationParams {
  userId: string;
  cursor?: string;
  size?: string;
  path: string;
}

@Injectable()
export class HeartService {
  private readonly logger = new Logger(HeartService.name);

  constructor(private readonly heartRepository: HeartRepository) {}

  async heart(userId: string, targetUserId: string): Promise<HeartItemBase> {
    return this.heartRepository.postHeart(userId, targetUserId);
  }

  async patchHeart(heartId: number): Promise<HeartItemBase> {
    return this.heartRepository.patchHeart(heartId);
  }

  async getReceivedHearts(
    params: PaginationParams,
  ): Promise<HeartListPayload<HeartReceivedItem>> {
    this.logger.debug(
      `getReceivedHearts called userId=${params.userId} cursor=${params.cursor} size=${params.size}`,
    );
    const { items, nextCursor } =
      await this.heartRepository.getReceivedHeartsByUserId({
        userId: params.userId,
        cursor: params.cursor,
        size: this.parseSize(params.size),
      });
    this.logger.debug(
      `getReceivedHearts repo returned count=${items.length} nextCursor=${nextCursor}`,
    );

    const payload: HeartReceivedItem[] = items.map((heart) => ({
      heartId: Number(heart.id),
      fromUserId: Number(heart.sentById),
      createdAt: heart.createdAt.toISOString(),
    }));
    return {
      nextCursor,
      items: payload,
    };
  }

  async getSentHearts(
    params: PaginationParams,
  ): Promise<HeartListPayload<HeartSentItem>> {
    this.logger.debug(
      `getSentHearts called userId=${params.userId} cursor=${params.cursor} size=${params.size}`,
    );
    const { items, nextCursor } =
      await this.heartRepository.getSentHeartsByUserId({
        userId: params.userId,
        cursor: params.cursor,
        size: this.parseSize(params.size),
      });
    this.logger.debug(
      `getSentHearts repo returned count=${items.length} nextCursor=${nextCursor}`,
    );

    const payload: HeartSentItem[] = items.map((heart) => ({
      heartId: Number(heart.id),
      targetUserId: Number(heart.sentToId),
      createdAt: heart.createdAt.toISOString(),
    }));

    return {
      nextCursor,
      items: payload,
    };
  }

  private parseSize(size?: string) {
    this.logger.debug(`parseSize input=${size}`);
    if (!size) return 20;
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(parsed, 50);
  }
}
