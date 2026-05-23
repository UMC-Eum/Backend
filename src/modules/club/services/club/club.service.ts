import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import {
  ClubDetailResponseDto,
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

@Injectable()
export class ClubService {
  constructor(private readonly clubRepository: ClubRepository) {}

  async listClubs(query: ListClubsQueryDto): Promise<ListClubsResponseDto> {
    const sort = query.sort ?? ClubListSort.POPULAR;
    const limit = query.limit ?? 20;
    const cursor = query.cursor
      ? decodeClubCursor(query.cursor, sort)
      : undefined;

    const rows = await this.clubRepository.findManyForList({
      keyword: query.keyword?.trim() || undefined,
      category: query.category,
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
}
