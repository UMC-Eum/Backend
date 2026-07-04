import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { AppException } from '../../../../common/errors/app.exception';
import { REDIS_CLIENT } from '../../../../infra/redis/redis.module';

const RECENT_CLUB_SEARCH_PREFIX = 'recent-search:club:user';
const RECENT_CLUB_SEARCH_MAX_COUNT = 10;
const RECENT_CLUB_SEARCH_TTL_SECONDS = 60 * 60 * 24 * 30;

@Injectable()
export class RecentClubSearchService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addRecentSearch(
    userId: bigint | number | string,
    keyword: string,
  ): Promise<void> {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return;
    }

    const key = this.getKey(userId);

    await this.redis
      .multi()
      .zadd(key, Date.now(), normalizedKeyword)
      .zremrangebyrank(key, 0, -RECENT_CLUB_SEARCH_MAX_COUNT - 1)
      .expire(key, RECENT_CLUB_SEARCH_TTL_SECONDS)
      .exec();
  }

  async getRecentSearches(userId: bigint | number | string): Promise<string[]> {
    try {
      return await this.redis.zrevrange(
        this.getKey(userId),
        0,
        RECENT_CLUB_SEARCH_MAX_COUNT - 1,
      );
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', { details: error });
    }
  }

  async deleteRecentSearch(
    userId: bigint | number | string,
    keyword: string,
  ): Promise<void> {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      throw new AppException('CLUB_RECENT_SEARCH_KEYWORD_REQUIRED');
    }

    try {
      await this.redis.zrem(this.getKey(userId), normalizedKeyword);
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', { details: error });
    }
  }

  async clearRecentSearches(userId: bigint | number | string): Promise<void> {
    try {
      await this.redis.del(this.getKey(userId));
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', { details: error });
    }
  }

  private getKey(userId: bigint | number | string): string {
    return `${RECENT_CLUB_SEARCH_PREFIX}:${userId}`;
  }
}
