import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus, Prisma } from '@prisma/client';
import {
  ClubDetailResponseDto,
  CreateClubRequestDto,
  CreateClubResponseDto,
  DeleteClubResponseDto,
  LikeClubResponseDto,
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
  ListTopHostsResponseDto,
  UpdateClubRequestDto,
  UpdateClubResponseDto,
} from '../../dtos/club.dto';
import { ClubRepository } from '../../repositories/club.repository';
import type { UpdatedClubRow } from '../../repositories/club.repository.types';
import {
  decodeClubCursor,
  encodeClubCursor,
} from '../../utils/club-cursor.util';
import { toClubDetailDto, toClubListItemDto } from '../../utils/club.mapper';
import { AppException } from '../../../../common/errors/app.exception';
import { UserRepository } from '../../../user/repositories/user.repository';
import { OnboardingAiService } from '../../../onboarding/services/onboarding-ai.service';

@Injectable()
export class ClubService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly userRepository: UserRepository,
    private readonly onboardingAiService: OnboardingAiService,
  ) {}

  async createClub(
    userId: number,
    dto: CreateClubRequestDto,
  ): Promise<CreateClubResponseDto> {
    const user = await this.userRepository.findProfileById(userId);
    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const created = await this.clubRepository.createClubWithHost({
      hostId: BigInt(userId),
      name: dto.name,
      category: dto.category,
      introText: dto.introText,
      introVoice: dto.introVoice,
      capacity: dto.capacity,
      addressCode: user.address?.code ?? null,
      keywordIds: dto.keywordIds,
    });

    try {
      const analysis = await this.onboardingAiService.analyzeClubVibe({
        clubId: Number(created.id),
        transcript: dto.introText,
        analysis_type: 'profile',
      });

      await this.clubRepository.applyClubAnalysis(
        created.id,
        analysis.selectedKeywords,
        analysis.vibeVector,
      );
    } catch (error) {
      await this.clubRepository.deleteCreatedClub(created.id, BigInt(userId));
      throw error;
    }

    return {
      clubId: Number(created.id),
      code: created.code ?? '',
      name: created.name,
      category: created.category,
      capacity: created.capacity,
      memberCount: created._count.clubUsers,
      host: {
        userId: Number(created.user?.id ?? user.id),
        nickname: created.user?.nickname ?? user.nickname,
        profileImageUrl:
          created.user?.profileImageUrl ?? user.profileImageUrl ?? null,
      },
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listClubs(
    userId: number,
    query: ListClubsQueryDto,
  ): Promise<ListClubsResponseDto> {
    const user = await this.userRepository.findProfileById(userId);
    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const sort = query.sort ?? ClubListSort.POPULAR;
    const limit = query.limit ?? 20;
    const cursor = query.cursor
      ? decodeClubCursor(query.cursor, sort)
      : undefined;

    const rows = await this.clubRepository.findManyForList({
      keyword: query.keyword?.trim() || undefined,
      category: query.category,
      code: user.address?.code ?? undefined,
      sort,
      cursor,
      limit,
    });

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext
      ? encodeClubCursor(page[page.length - 1], sort)
      : null;

    return {
      nextCursor,
      items: page.map((row) => toClubListItemDto(row)),
    };
  }

  async listTopHosts(limit: number): Promise<ListTopHostsResponseDto> {
    const rows = await this.clubRepository.findTopHosts(limit);
    return {
      hosts: rows.map((row) => ({
        hostId: row.hostId.toString(),
        name: row.hostName,
        profileImageUrl: row.profileImageUrl,
        clubCount: row.clubCount,
        totalLikes: row.totalLikes,
      })),
    };
  }

  async updateClub(
    userId: number,
    clubId: number,
    dto: UpdateClubRequestDto,
  ): Promise<UpdateClubResponseDto> {
    const clubKey = BigInt(clubId);
    const userKey = BigInt(userId);

    const club = await this.clubRepository.findById(clubKey);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== userKey) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const data = this.buildUpdateClubData(dto);
    const keywordIds =
      dto.keywordIds === undefined
        ? undefined
        : this.toUniqueBigIntIds(dto.keywordIds);

    const updated = await this.clubRepository.updateClub({
      clubId: clubKey,
      data,
      keywordIds,
    });

    return this.toUpdateClubResponseDto(updated);
  }

  async deleteClub(
    userId: number,
    clubId: number,
  ): Promise<DeleteClubResponseDto> {
    return this.softDeleteClubByHost(userId, clubId);
  }

  private async softDeleteClubByHost(
    userId: number,
    clubId: number,
  ): Promise<DeleteClubResponseDto> {
    const clubKey = BigInt(clubId);
    const userKey = BigInt(userId);

    const club = await this.clubRepository.findById(clubKey);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== userKey) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const deletedAt = new Date();
    const deleted = await this.clubRepository.softDeleteClub(
      clubKey,
      deletedAt,
    );

    return {
      clubId: deleted.id.toString(),
      deletedAt: (deleted.deletedAt ?? deletedAt).toISOString(),
    };
  }

  async getClubDetail(
    userId: number,
    clubId: number,
  ): Promise<ClubDetailResponseDto> {
    const clubKey = BigInt(clubId);
    const userKey = BigInt(userId);

    const club = await this.clubRepository.findDetailById(clubKey);
    if (!club) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const [isLiked, clubUser] = await Promise.all([
      this.clubRepository.hasClubLike(clubKey, userKey),
      this.clubRepository.findClubUserState(clubKey, userKey),
    ]);

    let isJoined = false;
    let myAuthority: ClubAuthority | null = null;

    if (club.hostId === userKey) {
      isJoined = true;
      myAuthority = ClubAuthority.HOST;
    } else if (
      clubUser &&
      clubUser.leftAt === null &&
      clubUser.status === ClubUserStatus.ACTIVE
    ) {
      isJoined = true;
      myAuthority = clubUser.authority;
    }

    return toClubDetailDto(club, { isLiked, isJoined, myAuthority });
  }

  async likeClub(userId: number, clubId: number): Promise<LikeClubResponseDto> {
    const clubKey = BigInt(clubId);
    const userKey = BigInt(userId);

    const result = await this.clubRepository.createClubLike(clubKey, userKey);
    if (!result) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (result.isDuplicate) {
      throw new AppException('CLUB_LIKE_ALREADY_EXISTS');
    }

    return {
      clubId: result.clubId.toString(),
      isLiked: true,
      likeCount: result.likeCount,
    };
  }

  async unlikeClub(
    userId: number,
    clubId: number,
  ): Promise<LikeClubResponseDto> {
    const clubKey = BigInt(clubId);
    const userKey = BigInt(userId);

    const result = await this.clubRepository.deleteClubLike(clubKey, userKey);
    if (!result) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (result.isMissing) {
      throw new AppException('CLUB_LIKE_NOT_FOUND');
    }

    return {
      clubId: result.clubId.toString(),
      isLiked: false,
      likeCount: result.likeCount,
    };
  }

  private buildUpdateClubData(
    dto: UpdateClubRequestDto,
  ): Prisma.ClubUpdateInput {
    const data: Prisma.ClubUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.introText !== undefined) data.introText = dto.introText;
    if (dto.introVoice !== undefined) data.introVoiceUrl = dto.introVoice;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.category !== undefined) data.category = dto.category;

    return data;
  }

  private toUniqueBigIntIds(ids: number[]): bigint[] {
    return Array.from(new Set(ids.map((id) => BigInt(id).toString())), (id) =>
      BigInt(id),
    );
  }

  private toUpdateClubResponseDto(row: UpdatedClubRow): UpdateClubResponseDto {
    return {
      clubId: row.id.toString(),
      name: row.name,
      category: row.category,
      introText: row.introText,
      introVoice: row.introVoiceUrl,
      capacity: row.capacity,
      keywords: row.clubKeywords
        .map((keyword) => keyword.personality.body)
        .filter((body): body is string => Boolean(body)),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  }
}
