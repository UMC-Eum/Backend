import { Injectable } from '@nestjs/common';
import { ActiveStatus, ClubUserStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ClubListSort } from '../dtos/club.dto';
import {
  CLUB_DETAIL_SELECT,
  CLUB_LIST_SELECT,
  MY_CLUB_LIST_SELECT,
  type ClubDetailRow,
  type ClubListRow,
  type ClubUserStateRow,
  type CreateClubLikeResult,
  type DeleteClubLikeResult,
  type ListClubsRepositoryParams,
  type ListMyClubsRepositoryParams,
  type MyClubRow,
  type TopHostRow,
} from './club.repository.types';

@Injectable()
export class ClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clubId: bigint): Promise<{
    id: bigint;
    hostId: bigint | null;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, hostId: true, deletedAt: true },
    });
  }

  async findManyForList(
    params: ListClubsRepositoryParams,
  ): Promise<ClubListRow[]> {
    return this.prisma.club.findMany({
      where: this.buildListWhere(params),
      select: CLUB_LIST_SELECT,
      orderBy: this.buildListOrderBy(params.sort),
      take: params.limit + 1,
    });
  }

  async findManyMyClubs(
    params: ListMyClubsRepositoryParams,
  ): Promise<MyClubRow[]> {
    return this.prisma.clubUser.findMany({
      where: this.buildMyClubsWhere(params),
      select: MY_CLUB_LIST_SELECT,
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    });
  }

  async findDetailById(clubId: bigint): Promise<ClubDetailRow | null> {
    return this.prisma.club.findFirst({
      where: { id: clubId, deletedAt: null },
      select: CLUB_DETAIL_SELECT,
    });
  }

  // 동호회에 대한 유저의 상태를 반환한다. (가입 여부, 권한, 탈퇴 여부 등)
  async findClubUserState(
    clubId: bigint,
    userId: bigint,
  ): Promise<ClubUserStateRow | null> {
    return this.prisma.clubUser.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      select: {
        authority: true,
        status: true,
        leftAt: true,
      },
    });
  }
  // isLiked 내가 동호회에 좋아요를 눌렀는가
  async hasClubLike(clubId: bigint, userId: bigint): Promise<boolean> {
    const like = await this.prisma.clubLike.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      select: { id: true },
    });

    return Boolean(like);
  }

  async createClubLike(
    clubId: bigint,
    userId: bigint,
  ): Promise<CreateClubLikeResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const club = await tx.club.findFirst({
        where: { id: clubId, deletedAt: null },
        select: { id: true, likes: true },
      });

      if (!club) {
        return null;
      }

      const created = await tx.clubLike.createMany({
        data: { clubId, userId },
        skipDuplicates: true,
      });

      if (created.count === 0) {
        return {
          clubId: club.id,
          likeCount: club.likes,
          isDuplicate: true,
        };
      }

      const updatedClub = await tx.club.update({
        where: { id: clubId },
        data: { likes: { increment: 1 } },
        select: { id: true, likes: true },
      });

      return {
        clubId: updatedClub.id,
        likeCount: updatedClub.likes,
        isDuplicate: false,
      };
    });
  }

  async deleteClubLike(
    clubId: bigint,
    userId: bigint,
  ): Promise<DeleteClubLikeResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const club = await tx.club.findFirst({
        where: { id: clubId, deletedAt: null },
        select: { id: true, likes: true },
      });

      if (!club) {
        return null;
      }

      const deleted = await tx.clubLike.deleteMany({
        where: { clubId, userId },
      });

      if (deleted.count === 0) {
        return {
          clubId: club.id,
          likeCount: club.likes,
          isMissing: true,
        };
      }

      const updatedClub = await tx.club.update({
        where: { id: clubId },
        data: { likes: { decrement: 1 } },
        select: { id: true, likes: true },
      });

      return {
        clubId: updatedClub.id,
        likeCount: updatedClub.likes,
        isMissing: false,
      };
    });
  }

  private buildListWhere(
    params: ListClubsRepositoryParams,
  ): Prisma.ClubWhereInput {
    const and: Prisma.ClubWhereInput[] = [{ deletedAt: null }];

    if (params.keyword) {
      and.push({
        OR: [
          { name: { contains: params.keyword } },
          { introText: { contains: params.keyword } },
          {
            clubKeywords: {
              some: {
                personality: {
                  body: { contains: params.keyword },
                },
              },
            },
          },
        ],
      });
    }

    if (params.category) {
      and.push({ category: params.category });
    }

    if (params.code) {
      and.push({ code: params.code });
    }

    if (params.cursor) {
      and.push(this.buildCursorWhere(params.cursor));
    }

    return { AND: and };
  }

  private buildCursorWhere(
    cursor: NonNullable<ListClubsRepositoryParams['cursor']>,
  ): Prisma.ClubWhereInput {
    if (cursor.type === 'DATE') {
      return {
        OR: [
          { createdAt: { lt: cursor.sortAt } },
          { createdAt: cursor.sortAt, id: { lt: cursor.clubId } },
        ],
      };
    }

    return {
      OR: [
        { likes: { lt: cursor.sortValue } },
        { likes: cursor.sortValue, id: { lt: cursor.clubId } },
      ],
    };
  }

  private buildListOrderBy(
    sort: ClubListSort,
  ): Prisma.ClubOrderByWithRelationInput[] {
    if (sort === ClubListSort.RECENT) {
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    }

    return [{ likes: 'desc' }, { id: 'desc' }];
  }

  private buildMyClubsWhere(
    params: ListMyClubsRepositoryParams,
  ): Prisma.ClubUserWhereInput {
    const and: Prisma.ClubUserWhereInput[] = [
      {
        userId: params.userId,
        leftAt: null,
        status: ClubUserStatus.ACTIVE,
        club: { deletedAt: null },
      },
    ];

    if (params.cursor) {
      and.push({
        OR: [
          { joinedAt: { lt: params.cursor.joinedAt } },
          {
            joinedAt: params.cursor.joinedAt,
            id: { lt: params.cursor.clubUserId },
          },
        ],
      });
    }

    return { AND: and };
  }

  async findTopHosts(limit: number): Promise<TopHostRow[]> {
    const rows = await this.prisma.club.groupBy({
      by: ['hostId'],

      where: {
        deletedAt: null,

        hostId: {
          not: null,
        },
      },

      _count: {
        id: true,
      },

      _sum: {
        likes: true,
      },

      orderBy: [
        {
          _count: {
            id: 'desc',
          },
        },

        {
          _sum: {
            likes: 'desc',
          },
        },
      ],

      take: limit,
    });

    if (rows.length === 0) {
      return [];
    }

    const hostIds = rows
      .map((row) => row.hostId)
      .filter((hostId): hostId is bigint => hostId !== null);

    const hosts = await this.prisma.user.findMany({
      where: {
        id: { in: hostIds },
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        nickname: true,
        profileImageUrl: true,
      },
    });

    const hostMap = new Map(hosts.map((host) => [host.id, host]));

    return rows.flatMap((row) => {
      if (!row.hostId) {
        return [];
      }
      const host = hostMap.get(row.hostId);
      if (!host) {
        return [];
      }

      return [
        {
          hostId: row.hostId,
          hostName: host.nickname,
          profileImageUrl: host.profileImageUrl ?? null,
          clubCount: row._count.id,
          totalLikes: row._sum.likes ?? 0,
        },
      ];
    });
  }
}
