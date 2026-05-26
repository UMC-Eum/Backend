import { Injectable } from '@nestjs/common';
import {
  ActiveStatus,
  ClubCategory,
  ClubAuthority,
  ClubUserStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ClubListSort } from '../dtos/club.dto';

export interface ListClubsRepositoryParams {
  keyword?: string;
  category?: ClubCategory;
  sort: ClubListSort;
  cursor?:
    | { type: 'DATE'; sortAt: Date; clubId: bigint }
    | { type: 'NUMBER'; sortValue: number; clubId: bigint };
  limit: number;
}

const CLUB_LIST_SELECT = {
  id: true,
  name: true,
  introText: true,
  category: true,
  thumbnailUrl: true,
  likes: true,
  createdAt: true,
  clubKeywords: {
    select: {
      personality: {
        select: {
          body: true,
        },
      },
    },
  },
  _count: {
    select: {
      clubUsers: {
        where: {
          leftAt: null,
          status: ClubUserStatus.ACTIVE,
        },
      },
    },
  },
} satisfies Prisma.ClubSelect;

export type ClubListRow = Prisma.ClubGetPayload<{
  select: typeof CLUB_LIST_SELECT;
}>;

const CLUB_DETAIL_SELECT = {
  id: true,
  hostId: true,
  name: true,
  category: true,
  introVoiceUrl: true,
  introText: true,
  capacity: true,
  likes: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      deletedAt: true,
      status: true,
    },
  },
  clubKeywords: {
    select: {
      personality: {
        select: {
          body: true,
        },
      },
    },
  },
  meetings: {
    where: {
      deletedAt: null,
      isRegular: true,
    },
    select: {
      id: true,
      name: true,
      date: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  _count: {
    select: {
      clubUsers: {
        where: {
          leftAt: null,
          status: ClubUserStatus.ACTIVE,
        },
      },
    },
  },
} satisfies Prisma.ClubSelect;

export type ClubDetailRow = Prisma.ClubGetPayload<{
  select: typeof CLUB_DETAIL_SELECT;
}>;

export interface TopHostRow {
  hostId: bigint;
  hostName: string;
  profileImageUrl: string | null;
  clubCount: number;
  totalLikes: number;
}

export interface ClubUserStateRow {
  authority: ClubAuthority;
  status: ClubUserStatus;
  leftAt: Date | null;
}

export interface CreateClubLikeResult {
  clubId: bigint;
  likeCount: number;
  isDuplicate: boolean;
}

export interface DeleteClubLikeResult {
  clubId: bigint;
  likeCount: number;
  isMissing: boolean;
}

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
