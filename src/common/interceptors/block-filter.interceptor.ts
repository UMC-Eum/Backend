/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, switchMap } from 'rxjs';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class BlockFilterInterceptor implements NestInterceptor {
  private blockCacheMap = new Map<
    string,
    { data: string[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

  constructor(private readonly prismaService: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const currentUserId = this.extractCurrentUserId(request);

    return next.handle().pipe(
      switchMap(async (data) => {
        if (!currentUserId) {
          return data;
        }
        try {
          const blockedUserIds = await this.getBlockedUserIds(currentUserId);
          if (blockedUserIds.length === 0) {
            return data;
          }
          return this.filterBlockedUsers(data, blockedUserIds);
        } catch {
          return data;
        }
      }),
    );
  }

  private extractCurrentUserId(request: any): string | null {
    const user = request.user;
    if (user && (user.id || user.userId)) {
      return (user.id ?? user.userId).toString();
    }
    const userIdHeader = request.headers['x-user-id'];
    if (userIdHeader) return userIdHeader;
    return null;
  }

  private async getBlockedUserIds(currentUserId: string): Promise<string[]> {
    const userId = BigInt(currentUserId);

    // 주기적으로 만료된 캐시 정리 (10% 확률로 실행)
    if (Math.random() < 0.1) {
      this.cleanExpiredCache();
    }

    // 캐시에서 조회
    const cachedBlockData = this.blockCacheMap.get(currentUserId);
    if (cachedBlockData) {
      const { data, timestamp } = cachedBlockData;
      const now = Date.now();
      // 캐시 유효기간 체크
      if (now - timestamp < this.CACHE_TTL) {
        return data;
      }
    }

    // 1. 현재 사용자가 차단한 사용자들 조회
    const blockedByCurrentUser = await this.prismaService.block.findMany({
      where: {
        blockedById: userId,
        status: 'BLOCKED',
        deletedAt: null,
      },
      select: {
        blockedId: true,
      },
    });

    // 2. 현재 사용자를 차단한 사용자들 조회
    const blockingCurrentUser = await this.prismaService.block.findMany({
      where: {
        blockedId: userId,
        status: 'BLOCKED',
        deletedAt: null,
      },
      select: {
        blockedById: true,
      },
    });

    // 양방향 차단 사용자 ID들을 합치고 중복 제거
    const blockedUserIds = new Set<string>();

    // 현재 사용자가 차단한 사용자들 추가
    blockedByCurrentUser.forEach((block) => {
      blockedUserIds.add(block.blockedId.toString());
    });

    // 현재 사용자를 차단한 사용자들 추가 (양방향 차단 처리)
    // blockedById는 현재 사용자를 차단한 사용자의 ID이므로, 이 사용자들을 차단 목록에 추가
    blockingCurrentUser.forEach((block) => {
      blockedUserIds.add(block.blockedById.toString());
    });

    const finalBlockedUserIds = Array.from(blockedUserIds);

    // 캐시에 저장
    this.blockCacheMap.set(currentUserId, {
      data: finalBlockedUserIds,
      timestamp: Date.now(),
    });

    return finalBlockedUserIds;
  }

  private filterBlockedUsers(data: any, blockedUserIds: string[]): any {
    if (!data) {
      return data;
    }

    // 배열인 경우
    if (Array.isArray(data)) {
      return data
        .filter((item) => {
          const isBlocked = this.isBlockedUser(item, blockedUserIds);
          return !isBlocked;
        })
        .map((item) => this.filterBlockedUsers(item, blockedUserIds));
    }

    // 객체인 경우
    if (typeof data === 'object') {
      // 페이지네이션 응답 처리
      if (data.items && Array.isArray(data.items)) {
        const filteredItems = data.items
          .filter((item: any) => {
            const isBlocked = this.isBlockedUser(item, blockedUserIds);
            return !isBlocked;
          })
          .map((item: any) => this.filterBlockedUsers(item, blockedUserIds));
        return {
          ...data,
          items: filteredItems,
        };
      }
      const filteredData: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isUserRelatedField(key) && Array.isArray(value)) {
          filteredData[key] = value
            .filter((item) => {
              const isBlocked = this.isBlockedUser(item, blockedUserIds);
              return !isBlocked;
            })
            .map((item) => this.filterBlockedUsers(item, blockedUserIds));
        } else if (typeof value === 'object' && value !== null) {
          filteredData[key] = this.filterBlockedUsers(value, blockedUserIds);
        } else {
          filteredData[key] = value;
        }
      }
      return filteredData;
    }
    return data;
  }

  private isBlockedUser(item: any, blockedUserIds: string[]): boolean {
    if (!item || typeof item !== 'object') {
      return false;
    }

    // 사용자 ID 필드들 확인
    const userIdFields = [
      'id',
      'userId',
      'authorId',
      'senderId',
      'sentById',
      'sentToId',
      'fromUserId',
      'targetUserId',
      'blockedId',
      'reportedId',
    ];

    for (const field of userIdFields) {
      if (item[field]) {
        const userId = item[field].toString();
        if (blockedUserIds.includes(userId)) {
          return true;
        }
      }
    }

    // 중첩된 사용자 객체 확인
    if (item.user && item.user.id) {
      const userId = item.user.id.toString();
      if (blockedUserIds.includes(userId)) {
        return true;
      }
    }

    if (item.author && item.author.id) {
      const userId = item.author.id.toString();
      if (blockedUserIds.includes(userId)) {
        return true;
      }
    }

    if (item.sender && item.sender.id) {
      const userId = item.sender.id.toString();
      if (blockedUserIds.includes(userId)) {
        return true;
      }
    }

    return false;
  }

  private isUserRelatedField(fieldName: string): boolean {
    const userRelatedFields = [
      'users',
      'authors',
      'senders',
      'recipients',
      'participants',
      'members',
      'followers',
      'following',
      'friends',
      'matches',
      'recommendations',
      'hearts',
      'messages',
      'comments',
      'posts',
      'reports',
      'notifications',
    ];
    return userRelatedFields.includes(fieldName);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [userId, cacheData] of this.blockCacheMap.entries()) {
      if (now - cacheData.timestamp > this.CACHE_TTL) {
        this.blockCacheMap.delete(userId);
      }
    }
  }
}
