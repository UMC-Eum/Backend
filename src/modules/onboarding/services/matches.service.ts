import { Injectable } from '@nestjs/common';
import { OnboardingAiService } from './onboarding-ai.service';
import { AppException } from '../../../common/errors/app.exception';
import { ClubRepository } from '../../club/repositories/club.repository';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(
    private readonly onboardingAiService: OnboardingAiService,
    private readonly clubRepository: ClubRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async getRecommendedMatches(userId: bigint, cursor?: string, size?: string) {
    const result = await this.onboardingAiService.getRecommendedMatches(
      userId,
      cursor,
      size,
    );
    const payload = this.extractDataPayload(result);
    const blockedUserIds = await this.findBlockedUserIdSet(userId);
    return this.withVisibleUserItems(payload, blockedUserIds);
  }

  async getRecommendedClubs(
    userId: bigint,
    cursor?: string,
    size?: string,
    areaCode?: string,
  ) {
    const result = await this.onboardingAiService.getRecommendedClubs(
      userId,
      cursor,
      size,
      areaCode,
    );
    const payload = this.extractDataPayload(result);
    const visiblePayload = await this.withVisibleClubItems(payload, userId);
    return this.withClubMemberCounts(visiblePayload);
  }

  private extractDataPayload(raw: unknown): Record<string, unknown> {
    if (typeof raw !== 'object' || raw === null) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: 'Invalid response from FastAPI',
      });
    }

    const record = raw as Record<string, unknown>;
    const success = record.success;
    if (
      typeof success === 'object' &&
      success !== null &&
      'data' in success &&
      typeof (success as { data?: unknown }).data === 'object' &&
      (success as { data?: unknown }).data !== null
    ) {
      return (success as { data: Record<string, unknown> }).data;
    }

    if (typeof record.data === 'object' && record.data !== null) {
      return record.data as Record<string, unknown>;
    }

    return record;
  }

  private async withClubMemberCounts(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!Array.isArray(payload.items)) {
      return payload;
    }

    const items = payload.items as unknown[];
    const clubIds = items
      .map((item) => this.pickClubId(item))
      .filter((clubId): clubId is bigint => clubId !== null);
    const uniqueClubIds = [
      ...new Set(clubIds.map((clubId) => clubId.toString())),
    ].map((clubId) => BigInt(clubId));

    const memberCounts =
      await this.clubRepository.findActiveMemberCountsByClubIds(uniqueClubIds);

    return {
      ...payload,
      items: items.map((item) => {
        if (typeof item !== 'object' || item === null) {
          return item;
        }

        const clubId = this.pickClubId(item);
        if (clubId === null) {
          return item;
        }

        return {
          ...item,
          memberCount: memberCounts.get(clubId.toString()) ?? 0,
        };
      }),
    };
  }

  private async withVisibleClubItems(
    payload: Record<string, unknown>,
    viewerId: bigint,
  ): Promise<Record<string, unknown>> {
    if (!Array.isArray(payload.items)) {
      return payload;
    }

    const clubIds = payload.items
      .map((item) => this.pickClubId(item))
      .filter((clubId): clubId is bigint => clubId !== null);
    const uniqueClubIds = [
      ...new Set(clubIds.map((clubId) => clubId.toString())),
    ].map((clubId) => BigInt(clubId));
    const visibleClubIds =
      await this.clubRepository.findVisibleClubIdsByClubIds(
        uniqueClubIds,
        viewerId,
      );

    return {
      ...payload,
      items: payload.items.filter((item) => {
        const clubId = this.pickClubId(item);
        return clubId === null || visibleClubIds.has(clubId.toString());
      }),
    };
  }

  private withVisibleUserItems(
    payload: Record<string, unknown>,
    blockedUserIds: Set<string>,
  ): Record<string, unknown> {
    if (!Array.isArray(payload.items) || blockedUserIds.size === 0) {
      return payload;
    }

    return {
      ...payload,
      items: payload.items.filter((item) => {
        const candidateUserId = this.pickUserId(item);
        return candidateUserId === null || !blockedUserIds.has(candidateUserId);
      }),
    };
  }

  private async findBlockedUserIdSet(userId: bigint): Promise<Set<string>> {
    const rows = await this.prismaService.block.findMany({
      where: {
        status: 'BLOCKED',
        deletedAt: null,
        OR: [{ blockedById: userId }, { blockedId: userId }],
      },
      select: {
        blockedById: true,
        blockedId: true,
      },
    });

    return new Set(
      rows.map((row) =>
        row.blockedById === userId
          ? row.blockedId.toString()
          : row.blockedById.toString(),
      ),
    );
  }

  private pickClubId(item: unknown): bigint | null {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    const value = (item as { clubId?: unknown }).clubId;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  private pickUserId(item: unknown): string | null {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    const record = item as {
      userId?: unknown;
      targetUserId?: unknown;
      profileUserId?: unknown;
    };
    const value = record.userId ?? record.targetUserId ?? record.profileUserId;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    try {
      return BigInt(value).toString();
    } catch {
      return null;
    }
  }
}
