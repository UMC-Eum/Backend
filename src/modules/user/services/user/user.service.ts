import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { UserMeResponseDto } from '../../dtos/user-me-response.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
import { UserInterestsUpdateRequestDto } from '../../dtos/user-interests-update-request.dto';
import { UserPersonalitiesUpdateRequestDto } from '../../dtos/user-personalities-update-request.dto';
import { UserIdealPersonalitiesUpdateRequestDto } from '../../dtos/user-ideal-personalities-update-request.dto';
import {
  UserClubsResponseDto,
  UserLikedClubsResponseDto,
} from '../../dtos/user-clubs-response.dto';
import { UserVisitorsResponseDto } from '../../dtos/user-visitors-response.dto';
import { UserPublicProfileResponseDto } from '../../dtos/user-public-profile-response.dto';
import { UserRepository } from '../../repositories/user.repository';

type ProfileVisitorsCursor = {
  visitedAt: string;
  logId: string;
};

@Injectable()
export class UserService {
  private static readonly DEFAULT_VISITORS_PAGE_SIZE = 20;
  private static readonly MAX_VISITORS_PAGE_SIZE = 50;

  constructor(private readonly userRepository: UserRepository) {}

  async getMe(userId: number): Promise<UserMeResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const user = await this.userRepository.findProfileById(userId);

    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    // TODO(schema-nullable): User.address가 nullable로 변경됨 (Address?). 주소 없는 유저 케이스 UX 정책 결정 필요.
    // 임시로 빈 문자열 fallback.
    const areaName = user.address?.sigunguName ?? user.address?.fullName ?? '';
    const keywords = user.interests
      .map((interest) => interest.interest.body)
      .filter((body): body is string => Boolean(body));
    const personalities = user.personalities
      .map((item) => item.personality.body)
      .filter((body): body is string => Boolean(body));
    const idealPersonalities = user.idealPersonalities
      .map((item) => item.personality.body)
      .filter((body): body is string => Boolean(body));
    const age = user.age;

    return {
      userId: Number(user.id),
      nickname: user.nickname,
      gender: user.sex,
      age,
      area: {
        // TODO(schema-nullable): address가 null일 때 code도 없음. 빈 문자열 fallback.
        code: user.address?.code ?? '',
        name: areaName,
      },
      introText: user.introText,
      keywords,
      personalities,
      idealPersonalities,
      introAudioUrl: user.introVoiceUrl,
      profileImageUrl: user.profileImageUrl,
    };
  }

  async getDetailedProfile(userId: number) {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const user = await this.userRepository.findDetailedProfileById(userId);

    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    return {
      id: Number(user.id),
      nickname: user.nickname,
      birthdate: user.birthdate.toISOString(),
      profileImageUrl: user.profileImageUrl,
      introText: user.introText,
      introVoiceUrl: user.introVoiceUrl,
      address: {
        // TODO(schema-nullable): User.address가 nullable. 빈 문자열 fallback.
        fullName: user.address?.fullName ?? '',
      },
      interests: user.interests.map((item) => ({
        interestId: Number(item.interestId),
        interest: {
          body: item.interest.body,
        },
      })),
      personalities: user.personalities.map((item) => ({
        personalityId: Number(item.personalityId),
        personality: {
          body: item.personality.body,
        },
      })),
    };
  }

  async getMyClubs(userId: number): Promise<UserClubsResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const memberships = await this.userRepository.findMyActiveClubs(userId);

    return {
      items: memberships.map((membership) => ({
        clubId: Number(membership.club.id),
        name: membership.club.name,
        thumbnailUrl: membership.club.thumbnailUrl,
        category: membership.club.category,
        introText: membership.club.introText,
        memberCount: membership.club.clubUsers.length,
        authority: membership.authority,
        joinedAt: membership.joinedAt?.toISOString() ?? '',
      })),
    };
  }

  async getMyLikedClubs(userId: number): Promise<UserLikedClubsResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const likes = await this.userRepository.findMyLikedClubs(userId);

    return {
      items: likes.map((like) => ({
        clubId: Number(like.club.id),
        name: like.club.name,
        thumbnailUrl: like.club.thumbnailUrl,
        category: like.club.category,
        introText: like.club.introText,
        memberCount: like.club.clubUsers.length,
        likedAt: like.createdAt.toISOString(),
      })),
    };
  }

  async getMyVisitors(
    userId: number,
    query: { cursor?: string; size?: string } = {},
  ): Promise<UserVisitorsResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const size = this.parseVisitorsPageSize(query.size);
    const cursor = query.cursor
      ? this.decodeProfileVisitorsCursor(query.cursor)
      : null;
    const visitors = await this.userRepository.findMyLatestProfileVisitors({
      userId,
      cursor,
      take: size + 1,
    });
    const hasNext = visitors.length > size;
    const page = hasNext ? visitors.slice(0, size) : visitors;
    const nextCursor =
      hasNext && page.length > 0
        ? this.encodeProfileVisitorsCursor({
            visitedAt: page[page.length - 1].visitedAtCursor,
            logId: page[page.length - 1].logId.toString(),
          })
        : null;

    return {
      nextCursor,
      items: page.map(({ user, visitedAt }) => ({
        userId: Number(user.id),
        nickname: user.nickname,
        gender: user.sex,
        age: user.age,
        areaName: user.address?.sigunguName ?? user.address?.fullName ?? null,
        introText: user.introText,
        profileImageUrl: user.profileImageUrl,
        visitedAt: visitedAt.toISOString(),
      })),
    };
  }

  async getPublicProfile(
    viewerUserId: number,
    targetUserId: number,
  ): Promise<UserPublicProfileResponseDto> {
    if (!viewerUserId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const user = await this.userRepository.findPublicProfileById(targetUserId);
    if (!user) {
      throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
        details: { targetUserId },
      });
    }

    if (viewerUserId !== targetUserId) {
      await this.userRepository.createProfileVisitLog({
        visitedBy: viewerUserId,
        visitedTo: targetUserId,
      });
    }

    const hostingClubIds = new Set(user.clubs.map((club) => club.id));
    for (const membership of user.clubUsers) {
      if (membership.authority === 'HOST') {
        hostingClubIds.add(membership.club.id);
      }
    }

    const participatingClubs = user.clubUsers
      .filter((membership) => !hostingClubIds.has(membership.club.id))
      .map((membership) => this.mapPublicProfileClub(membership.club));
    const hostingClubsById = new Map(
      [
        ...user.clubs.map((club) => this.mapPublicProfileClub(club)),
        ...user.clubUsers
          .filter((membership) => membership.authority === 'HOST')
          .map((membership) => this.mapPublicProfileClub(membership.club)),
      ].map((club) => [club.clubId, club]),
    );

    return {
      userId: Number(user.id),
      nickname: user.nickname,
      age: user.age,
      gender: user.sex,
      area: {
        name: user.address?.sigunguName ?? user.address?.fullName ?? '',
      },
      introText: user.introText,
      interests: user.interests
        .map((item) => item.interest.body)
        .filter((body): body is string => Boolean(body)),
      idealPersonalities: user.idealPersonalities
        .map((item) => item.personality.body)
        .filter((body): body is string => Boolean(body)),
      participatingClubs,
      hostingClubs: Array.from(hostingClubsById.values()),
      profileImageUrl: user.profileImageUrl,
    };
  }

  async markProfileVisit(
    visitorUserId: number,
    visitedUserId: number,
  ): Promise<null> {
    if (!visitorUserId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const targetUser =
      await this.userRepository.findActiveUserId(visitedUserId);
    if (!targetUser) {
      throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
        details: { targetUserId: visitedUserId },
      });
    }

    if (visitorUserId === visitedUserId) {
      return null;
    }

    await this.userRepository.createProfileVisitLog({
      visitedBy: visitorUserId,
      visitedTo: visitedUserId,
    });

    return null;
  }

  async updateMe(
    userId: number,
    payload: UserProfileUpdateRequestDto,
  ): Promise<UserMeResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const updateData: {
      nickname?: string;
      sex?: UserMeResponseDto['gender'];
      age?: number;
      code?: string;
      introText?: string;
      introVoiceUrl?: string;
      profileImageUrl?: string;
    } = {};

    if (payload.nickname !== undefined) {
      updateData.nickname = payload.nickname;
    }

    if (payload.gender !== undefined) {
      updateData.sex = payload.gender;
    }

    if (payload.age !== undefined) {
      updateData.age = payload.age;
    }

    if (payload.areaCode !== undefined) {
      const address = await this.userRepository.findAddressByCode(
        payload.areaCode,
      );
      if (!address) {
        throw new AppException('VALIDATION_INVALID_FORMAT', {
          message: '유효하지 않은 지역 코드입니다.',
        });
      }
      updateData.code = payload.areaCode;
    }

    if (payload.introText !== undefined) {
      updateData.introText = payload.introText;
    }

    if (payload.introAudioUrl !== undefined) {
      updateData.introVoiceUrl = payload.introAudioUrl;
    }

    if (payload.profileImageUrl !== undefined) {
      updateData.profileImageUrl = payload.profileImageUrl;
    }

    if (Object.keys(updateData).length > 0) {
      const result = await this.userRepository.updateProfile(
        userId,
        updateData,
      );

      if (result.count === 0) {
        throw new AppException('AUTH_LOGIN_REQUIRED');
      }
    }

    if (payload.keywords !== undefined) {
      await this.updateKeywordsByBodies(userId, payload.keywords);
    }

    if (payload.personalities !== undefined) {
      await this.updatePersonalitiesByBodies(userId, payload.personalities);
    }

    if (payload.idealPersonalities !== undefined) {
      await this.updateIdealPersonalitiesByBodies(
        userId,
        payload.idealPersonalities,
      );
    }

    return this.getMe(userId);
  }

  async deactivateMe(userId: number): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const result = await this.userRepository.deactivateProfile(userId);

    if (result.count === 0) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    return null;
  }

  async updateInterests(
    userId: number,
    payload: UserInterestsUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updateKeywords(userId, payload.interestIds);

    return null;
  }

  async updatePersonalities(
    userId: number,
    payload: UserPersonalitiesUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updatePersonalities(
      userId,
      payload.personalityIds,
    );

    return null;
  }

  async updateIdealPersonalities(
    userId: number,
    payload: UserIdealPersonalitiesUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.updateIdealPersonalitiesByBodies(
      userId,
      payload.personalityKeywords,
    );

    return null;
  }

  // 키워드 검증 + 에러 처리
  private async updateKeywordsByBodies(
    userId: number,
    keywords: string[],
  ): Promise<void> {
    const trimmed = keywords.map((keyword) => keyword.trim()).filter(Boolean);
    const uniqueKeywords = Array.from(new Set(trimmed));

    if (uniqueKeywords.length === 0) {
      await this.userRepository.updateKeywords(userId, []);
      return;
    }

    const interests =
      await this.userRepository.findInterestsByBodies(uniqueKeywords);
    const matched = new Map(
      interests.map((interest) => [interest.body, interest]),
    );
    const missing = uniqueKeywords.filter((keyword) => !matched.has(keyword));

    if (missing.length > 0) {
      throw new AppException('KEYWORD_NOT_FOUND', {
        details: {
          invalidKeywords: missing,
        },
      });
    }

    const ids = interests.map((interest) => Number(interest.id));
    await this.userRepository.updateKeywords(userId, ids);
  }

  // 성향 검증 + 에러 처리
  private async updatePersonalitiesByBodies(
    userId: number,
    personalities: string[],
  ): Promise<void> {
    const trimmed = personalities
      .map((personality) => personality.trim())
      .filter(Boolean);
    const uniquePersonalities = Array.from(new Set(trimmed));

    if (uniquePersonalities.length === 0) {
      await this.userRepository.updatePersonalities(userId, []);
      return;
    }

    const entries =
      await this.userRepository.findPersonalitiesByBodies(uniquePersonalities);
    const matched = new Map(entries.map((entry) => [entry.body, entry]));
    const missing = uniquePersonalities.filter(
      (personality) => !matched.has(personality),
    );

    if (missing.length > 0) {
      throw new AppException('KEYWORD_NOT_FOUND', {
        details: {
          invalidKeywords: missing,
        },
      });
    }

    const ids = entries.map((entry) => Number(entry.id));
    await this.userRepository.updatePersonalities(userId, ids);
  }

  // 이상형 성향 검증 + 에러 처리
  private async updateIdealPersonalitiesByBodies(
    userId: number,
    personalities: string[],
  ): Promise<void> {
    const normalized = personalities
      .map((personality) => personality.trim())
      .filter(Boolean);
    const uniquePersonalities = Array.from(new Set(normalized));

    if (uniquePersonalities.length === 0) {
      await this.userRepository.updateIdealPersonalities(userId, []);
      return;
    }

    const entries = await this.userRepository.findAllPersonalities();
    const matched = new Map<string, (typeof entries)[number]>();

    for (const entry of entries) {
      const body = entry.body?.trim();
      if (!body || matched.has(body)) {
        continue;
      }
      matched.set(body, entry);
    }
    const missing = uniquePersonalities.filter(
      (personality) => !matched.has(personality),
    );

    if (missing.length > 0) {
      throw new AppException('KEYWORD_NOT_FOUND', {
        details: {
          invalidKeywords: missing,
        },
      });
    }

    const ids = uniquePersonalities.map((personality) => {
      const entry = matched.get(personality);
      return Number(entry!.id);
    });
    await this.userRepository.updateIdealPersonalities(userId, ids);
  }

  private parseVisitorsPageSize(size?: string): number {
    if (!size) {
      return UserService.DEFAULT_VISITORS_PAGE_SIZE;
    }

    const parsed = Number(size);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return UserService.DEFAULT_VISITORS_PAGE_SIZE;
    }

    return Math.min(parsed, UserService.MAX_VISITORS_PAGE_SIZE);
  }

  private encodeProfileVisitorsCursor(payload: ProfileVisitorsCursor): string {
    return Buffer.from(JSON.stringify(payload), 'utf8')
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }

  private decodeProfileVisitorsCursor(cursor: string): ProfileVisitorsCursor {
    try {
      const padLen = (4 - (cursor.length % 4)) % 4;
      const padded = cursor + '='.repeat(padLen);
      const json = Buffer.from(
        padded.replaceAll('-', '+').replaceAll('_', '/'),
        'base64',
      ).toString('utf8');
      const parsed = JSON.parse(json) as Record<string, unknown>;

      if (
        typeof parsed.visitedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(
          parsed.visitedAt,
        ) ||
        typeof parsed.logId !== 'string' ||
        !/^\d+$/.test(parsed.logId)
      ) {
        throw new Error('invalid profile visitors cursor');
      }

      return {
        visitedAt: parsed.visitedAt,
        logId: parsed.logId,
      };
    } catch {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'cursor 형식이 올바르지 않습니다.',
      });
    }
  }

  private mapPublicProfileClub(club: {
    id: bigint;
    name: string;
    thumbnailUrl: string | null;
    category: UserPublicProfileResponseDto['participatingClubs'][number]['category'];
    introText: string | null;
  }): UserPublicProfileResponseDto['participatingClubs'][number] {
    return {
      clubId: Number(club.id),
      name: club.name,
      thumbnailUrl: club.thumbnailUrl,
      category: club.category,
      introText: club.introText,
    };
  }
}
