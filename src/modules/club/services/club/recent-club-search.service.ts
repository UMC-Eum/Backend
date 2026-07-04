import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { PrismaService } from '../../../../infra/prisma/prisma.service';

const RECENT_CLUB_SEARCH_MAX_COUNT = 30;

@Injectable()
export class RecentClubSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async addRecentSearch(
    userId: bigint | number | string,
    keyword: string,
  ): Promise<void> {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return;
    }

    const userKey = BigInt(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.recentSearchKeyword.createMany({
        data: {
          userId: userKey,
          keyword: normalizedKeyword,
        },
        skipDuplicates: true,
      });

      const staleSearches = await tx.recentSearchKeyword.findMany({
        where: { userId: userKey },
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: RECENT_CLUB_SEARCH_MAX_COUNT,
      });

      if (staleSearches.length > 0) {
        await tx.recentSearchKeyword.deleteMany({
          where: {
            id: { in: staleSearches.map((search) => search.id) },
          },
        });
      }
    });
  }

  async getRecentSearches(userId: bigint | number | string): Promise<string[]> {
    try {
      const searches = await this.prisma.recentSearchKeyword.findMany({
        where: { userId: BigInt(userId) },
        select: { keyword: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: RECENT_CLUB_SEARCH_MAX_COUNT,
      });

      return searches.map((search) => search.keyword);
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
      await this.prisma.recentSearchKeyword.deleteMany({
        where: {
          userId: BigInt(userId),
          keyword: normalizedKeyword,
        },
      });
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', { details: error });
    }
  }

  async clearRecentSearches(userId: bigint | number | string): Promise<void> {
    try {
      await this.prisma.recentSearchKeyword.deleteMany({
        where: { userId: BigInt(userId) },
      });
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', { details: error });
    }
  }
}
