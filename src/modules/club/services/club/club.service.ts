import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import {
  ClubDetailResponseDto,
  LikeClubResponseDto,
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
  ListTopHostsResponseDto,
} from '../../dtos/club.dto';
import { ClubRepository } from '../../repositories/club.repository';
import {
  decodeClubCursor,
  encodeClubCursor,
} from '../../utils/club-cursor.util';
import { toClubDetailDto, toClubListItemDto } from '../../utils/club.mapper';
import { AppException } from '../../../../common/errors/app.exception';
import { UserRepository } from '../../../user/repositories/user.repository';

@Injectable()
export class ClubService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly userRepository: UserRepository,
  ) {}

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
}
