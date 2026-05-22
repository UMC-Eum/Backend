import { Injectable } from '@nestjs/common';
import { ClubCategory, ClubUserStatus, Prisma } from '@prisma/client';
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
}
