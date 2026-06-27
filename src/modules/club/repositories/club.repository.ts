import { Injectable } from '@nestjs/common';
import {
  ActiveStatus,
  ClubAuthority,
  ClubUserStatus,
  Prisma,
} from '@prisma/client';
import { toPgVectorLiteral } from '../../../common/utils/pgvector.util';
import { AppException } from '../../../common/errors/app.exception';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ClubListSort } from '../dtos/club.dto';
import {
  CLUB_DETAIL_SELECT,
  CLUB_LIST_SELECT,
  UPDATE_CLUB_SELECT,
  type ClubDetailRow,
  type ClubListRow,
  type ClubUserStateRow,
  type CreatedClubRow,
  type CreateClubRepositoryParams,
  type CreateClubLikeResult,
  type DeleteClubLikeResult,
  type ListClubsRepositoryParams,
  type TopHostRow,
  type UpdateClubRepositoryParams,
  type UpdatedClubRow,
} from './club.repository.types';

@Injectable()
export class ClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createClubWithHost(
    params: CreateClubRepositoryParams,
  ): Promise<CreatedClubRow> {
    const uniqueKeywordIds = this.toUniqueBigIntIds(params.keywordIds);

    if (uniqueKeywordIds.length > 0) {
      const keywordCount = await this.prisma.personality.count({
        where: { id: { in: uniqueKeywordIds } },
      });

      if (keywordCount !== uniqueKeywordIds.length) {
        throw new AppException('KEYWORD_NOT_FOUND');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const insertedRows = await tx.$queryRaw<Array<{ id: bigint }>>(
        Prisma.sql`
          INSERT INTO "Club" (
            "hostId",
            "name",
            "introVoiceUrl",
            "introText",
            "category",
            "capacity",
            "code",
            "likes",
            "vibeVector"
          )
          VALUES (
            ${params.hostId},
            ${params.name},
            ${params.introVoice},
            ${params.introText},
            ${params.category}::"ClubCategory",
            ${params.capacity},
            ${params.addressCode},
            ${0},
            '[0]'::vector
          )
          RETURNING "id"
        `,
      );

      const clubId = insertedRows[0]?.id;
      if (!clubId) {
        throw new AppException('SERVER_TEMPORARY_ERROR');
      }

      await tx.clubUser.create({
        data: {
          clubId,
          userId: params.hostId,
          authority: ClubAuthority.HOST,
          status: ClubUserStatus.ACTIVE,
        },
      });

      if (uniqueKeywordIds.length > 0) {
        await tx.clubKeyword.createMany({
          data: uniqueKeywordIds.map((keywordId) => ({
            clubId,
            keywordId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.club.findUniqueOrThrow({
        where: { id: clubId },
        select: this.createdClubSelect(),
      });
    });
  }

  async applyClubAnalysis(
    clubId: bigint,
    selectedKeywords: string[],
    vibeVector: number[],
  ): Promise<void> {
    const vibeVectorLiteral = toPgVectorLiteral(vibeVector);
    const uniqueKeywords = Array.from(
      new Set(
        selectedKeywords.map((keyword) => keyword.trim()).filter(Boolean),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Club"
        SET "vibeVector" = ${vibeVectorLiteral}::vector
        WHERE "id" = ${clubId}
      `;

      const personalities = await Promise.all(
        uniqueKeywords.map((keyword) =>
          tx.personality.upsert({
            where: { body: keyword },
            update: {},
            create: { body: keyword },
            select: { id: true },
          }),
        ),
      );

      await tx.clubKeyword.createMany({
        data: personalities.map(({ id }) => ({
          clubId,
          keywordId: id,
        })),
        skipDuplicates: true,
      });
    });
  }

  async deleteCreatedClub(clubId: bigint, hostId: bigint): Promise<void> {
    await this.prisma.club.deleteMany({
      where: {
        id: clubId,
        hostId,
      },
    });
  }

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

  async updateClub(
    params: UpdateClubRepositoryParams,
  ): Promise<UpdatedClubRow> {
    const keywordIds = params.keywordIds;

    if (keywordIds !== undefined && keywordIds.length > 0) {
      const keywordCount = await this.prisma.personality.count({
        where: { id: { in: keywordIds } },
      });

      if (keywordCount !== keywordIds.length) {
        throw new AppException('KEYWORD_NOT_FOUND');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const hasClubData = Object.keys(params.data).length > 0;

      if (keywordIds !== undefined) {
        await tx.clubKeyword.deleteMany({
          where: { clubId: params.clubId },
        });

        if (keywordIds.length > 0) {
          await tx.clubKeyword.createMany({
            data: keywordIds.map((keywordId) => ({
              clubId: params.clubId,
              keywordId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (hasClubData) {
        return tx.club.update({
          where: { id: params.clubId },
          data: params.data,
          select: UPDATE_CLUB_SELECT,
        });
      }

      return tx.club.findUniqueOrThrow({
        where: { id: params.clubId },
        select: UPDATE_CLUB_SELECT,
      });
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

  private createdClubSelect() {
    return {
      id: true,
      code: true,
      name: true,
      category: true,
      capacity: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          nickname: true,
          profileImageUrl: true,
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
  }

  private toUniqueBigIntIds(ids: number[]): bigint[] {
    return Array.from(
      new Set(
        ids
          .filter((id) => Number.isInteger(id) && id > 0)
          .map((id) => BigInt(id).toString()),
      ),
      (id) => BigInt(id),
    );
  }
}
