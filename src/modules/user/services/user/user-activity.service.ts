import { Inject, Injectable } from '@nestjs/common';
import {
  PRESENCE_STORE,
  type PresenceStore,
} from '../../../../infra/websocket/presence/presence.token';
import { AppException } from '../../../../common/errors/app.exception';
import {
  decodeCursorRaw,
  encodeCursor,
} from '../../../../common/utils/cursor.util';
import { ActiveUsersResponseDto } from '../../dtos/user-active-response.dto';
import { UserRepository } from '../../repositories/user.repository';

export const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000;
export const LAST_ACTIVE_PERSIST_INTERVAL_MS = 5 * 60 * 1000;

type ActiveUsersCursor = {
  lastActiveAt: string;
  userId: number;
};

@Injectable()
export class UserActivityService {
  private static readonly DEFAULT_ACTIVE_USERS_PAGE_SIZE = 20;
  private static readonly MAX_ACTIVE_USERS_PAGE_SIZE = 50;

  private readonly lastPersistedActivityByUserId = new Map<number, number>();

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
  ) {}

  async recordActivity(userId: number, activeAt = new Date()): Promise<void> {
    if (!userId) return;

    const activeAtMs = activeAt.getTime();
    const lastPersistedAtMs =
      this.lastPersistedActivityByUserId.get(userId) ?? 0;
    if (activeAtMs - lastPersistedAtMs < LAST_ACTIVE_PERSIST_INTERVAL_MS) {
      return;
    }

    this.lastPersistedActivityByUserId.set(userId, activeAtMs);

    try {
      await this.userRepository.updateLastActiveAt(userId, activeAt);
    } catch (e) {
      this.lastPersistedActivityByUserId.delete(userId);
      throw e;
    }
  }

  async getActiveUsers(
    viewerUserId: number,
    query: { areaCode?: string; cursor?: string; size?: string } = {},
  ): Promise<ActiveUsersResponseDto> {
    if (!viewerUserId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const viewer =
      await this.userRepository.findActiveUserAreaById(viewerUserId);
    if (!viewer) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const area = query.areaCode
      ? await this.userRepository.findAddressAreaByCode(query.areaCode)
      : viewer.address;
    if (query.areaCode && !area) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '유효하지 않은 지역 코드입니다.',
      });
    }

    const size = this.parsePageSize(query.size);
    if (!area) {
      return this.emptyResponse(size);
    }

    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const activeUsers = this.presenceStore
      .getActiveUsers(ACTIVE_USER_WINDOW_MS)
      .filter((user) => user.userId !== viewerUserId);
    const activeByUserId = new Map(
      activeUsers.map((user) => [user.userId, user.lastActiveAt]),
    );
    const profiles = await this.userRepository.findActiveUsersByIdsInArea({
      userIds: [...activeByUserId.keys()],
      sidoCode: area.sidoCode,
      sigunguCode: area.sigunguCode,
    });

    const merged = profiles
      .map((profile) => {
        const lastActiveAt = activeByUserId.get(Number(profile.id));
        if (!lastActiveAt) return null;

        return {
          userId: Number(profile.id),
          nickname: profile.nickname,
          gender: profile.sex,
          age: profile.age,
          areaName:
            profile.address?.sigunguName ?? profile.address?.fullName ?? null,
          introText: profile.introText,
          profileImageUrl: profile.profileImageUrl,
          lastActiveAt,
        };
      })
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .sort((a, b) => {
        const timeDiff = b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.userId - b.userId;
      });

    const afterCursor = cursor
      ? merged.filter((user) => this.isAfterCursor(user, cursor))
      : merged;
    const page = afterCursor.slice(0, size + 1);
    const hasNext = page.length > size;
    const items = hasNext ? page.slice(0, size) : page;
    const last = items.at(-1);

    return {
      items: items.map((user) => ({
        ...user,
        lastActiveAt: user.lastActiveAt.toISOString(),
      })),
      page: {
        size,
        hasNext,
        nextCursor:
          hasNext && last
            ? encodeCursor({
                lastActiveAt: last.lastActiveAt.toISOString(),
                userId: last.userId,
              })
            : null,
      },
    };
  }

  private parsePageSize(size?: string): number {
    if (!size) {
      return UserActivityService.DEFAULT_ACTIVE_USERS_PAGE_SIZE;
    }

    const parsed = Number(size);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return UserActivityService.DEFAULT_ACTIVE_USERS_PAGE_SIZE;
    }

    return Math.min(parsed, UserActivityService.MAX_ACTIVE_USERS_PAGE_SIZE);
  }

  private decodeCursor(cursor: string): ActiveUsersCursor {
    const parsed = decodeCursorRaw(cursor);

    if (
      typeof parsed.lastActiveAt !== 'string' ||
      Number.isNaN(new Date(parsed.lastActiveAt).getTime()) ||
      typeof parsed.userId !== 'number' ||
      !Number.isInteger(parsed.userId) ||
      parsed.userId <= 0
    ) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'cursor 형식이 올바르지 않습니다.',
      });
    }

    return {
      lastActiveAt: parsed.lastActiveAt,
      userId: parsed.userId,
    };
  }

  private isAfterCursor(
    user: { userId: number; lastActiveAt: Date },
    cursor: ActiveUsersCursor,
  ): boolean {
    const cursorTime = new Date(cursor.lastActiveAt).getTime();
    const userTime = user.lastActiveAt.getTime();

    return (
      userTime < cursorTime ||
      (userTime === cursorTime && user.userId > cursor.userId)
    );
  }

  private emptyResponse(size: number): ActiveUsersResponseDto {
    return {
      items: [],
      page: {
        size,
        hasNext: false,
        nextCursor: null,
      },
    };
  }
}
