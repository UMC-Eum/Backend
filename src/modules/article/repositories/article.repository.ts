import { Injectable } from '@nestjs/common';
import { Prisma, ArticleCategory, ClubAuthority } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ArticleSort } from '../dtos/list-articles-query.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';

type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        nickname: true;
        profileImageUrl: true;
      };
    };
    articlePhotos: {
      select: {
        id: true;
        photoUrl: true;
      };
    };
    _count: {
      select: {
        comments: true;
      };
    };
  };
}>;

type ArticleDetailRecord = Prisma.ArticleGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        nickname: true;
        profileImageUrl: true;
      };
    };
    articlePhotos: {
      select: {
        id: true;
        photoUrl: true;
      };
    };
    articleLikes: {
      select: {
        id: true;
      };
    };
    comments: {
      include: {
        user: {
          select: {
            id: true;
            nickname: true;
            profileImageUrl: true;
          };
        };
      };
    };
  };
}>;

export type ArticleDetailResult = {
  article: ArticleDetailRecord;
  authorAuthorities: Map<string, ClubAuthority>;
};

export type UpdateArticleResult =
  | { status: 'success'; article: { id: bigint; updatedAt: Date } }
  | { status: 'not_found' }
  | { status: 'forbidden' };

export type DeleteArticleResult =
  | { status: 'success'; article: { id: bigint; deletedAt: Date } }
  | { status: 'not_found' }
  | { status: 'forbidden' };

export type LikeArticleResult =
  | {
      status: 'success';
      article: {
        id: bigint;
        clubId: bigint;
        likes: number;
        userId: bigint | null;
        user: { nickname: string } | null;
        club: { name: string };
      };
      sender: { nickname: string } | null;
      created: boolean;
    }
  | { status: 'not_found' };

export type UnlikeArticleResult =
  | { status: 'success'; article: { id: bigint; likes: number } }
  | { status: 'not_found' };

export type PinArticleResult =
  | {
      status: 'success';
      article: { id: bigint; isPinned: boolean; updatedAt: Date };
    }
  | { status: 'not_found' }
  | { status: 'forbidden' };

@Injectable()
export class ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsClub(clubId: number): Promise<boolean> {
    const club = await this.prisma.club.findFirst({
      where: {
        id: BigInt(clubId),
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return club !== null;
  }

  async findClubReadSettings(
    clubId: number,
  ): Promise<{ id: bigint; boardPublic: boolean } | null> {
    return this.prisma.club.findFirst({
      where: {
        id: BigInt(clubId),
        deletedAt: null,
      },
      select: {
        id: true,
        boardPublic: true,
      },
    });
  }

  async existsActiveClubUser(userId: number, clubId: number): Promise<boolean> {
    const clubUser = await this.prisma.clubUser.findFirst({
      where: {
        userId: BigInt(userId),
        clubId: BigInt(clubId),
        status: 'ACTIVE',
        leftAt: null,
      },
      select: {
        id: true,
      },
    });

    return clubUser !== null;
  }

  async findArticlesByClub(
    clubId: number,
    params: {
      category?: ArticleCategory;
      sort: ArticleSort;
      cursor?: bigint;
      take: number;
    },
  ): Promise<ArticleWithRelations[]> {
    return this.prisma.article.findMany({
      where: {
        clubId: BigInt(clubId),
        deletedAt: null,
        ...(params.category && { category: params.category }),
      },
      take: params.take,
      orderBy:
        params.sort === 'popular'
          ? [
              { isPinned: 'desc' },
              { likes: 'desc' },
              { createdAt: 'desc' },
              { id: 'desc' },
            ]
          : [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      ...(params.cursor && {
        cursor: { id: params.cursor },
        skip: 1,
      }),
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        articlePhotos: {
          where: { deletedAt: null },
          select: {
            id: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async createArticle(
    userId: number,
    clubId: number,
    title: string,
    contents: string,
    category: ArticleCategory,
    photoUrls?: string[],
  ): Promise<ArticleWithRelations> {
    return this.prisma.article.create({
      data: {
        userId: BigInt(userId),
        clubId: BigInt(clubId),
        title,
        contents,
        category,
        articlePhotos: {
          create: (photoUrls ?? []).map((photoUrl) => ({
            photoUrl,
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        articlePhotos: {
          select: {
            id: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async findArticleDetail(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<ArticleDetailResult | null> {
    const viewerId = BigInt(userId);
    const clubBigIntId = BigInt(clubId);

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: clubBigIntId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
          articlePhotos: {
            where: { deletedAt: null },
            select: {
              id: true,
              photoUrl: true,
            },
          },
          articleLikes: {
            where: { userId: viewerId },
            select: {
              id: true,
            },
          },
          comments: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  profileImageUrl: true,
                },
              },
            },
          },
        },
      });

      if (!article) {
        return null;
      }

      let articleWithView = article;

      // 작성자 본인이 조회한 것은 조회수 증가에 영향을 미치지 않습니다.
      if (article.userId !== viewerId) {
        const updated = await tx.article.update({
          where: { id: article.id },
          data: { view: { increment: 1 } },
          select: { view: true },
        });

        articleWithView = { ...article, view: updated.view };
      }

      const authorIds = [
        article.userId,
        ...article.comments.map((comment) => comment.userId),
      ].filter((id): id is bigint => id !== null);

      const uniqueAuthorIds = [
        ...new Set(authorIds.map((id) => id.toString())),
      ].map((id) => BigInt(id));

      const clubUsers =
        uniqueAuthorIds.length > 0
          ? await tx.clubUser.findMany({
              where: {
                clubId: clubBigIntId,
                userId: { in: uniqueAuthorIds },
              },
              select: {
                userId: true,
                authority: true,
              },
            })
          : [];

      return {
        article: articleWithView,
        authorAuthorities: new Map(
          clubUsers.map((clubUser) => [
            clubUser.userId.toString(),
            clubUser.authority,
          ]),
        ),
      };
    });
  }

  async updateArticle(
    userId: number,
    clubId: number,
    articleId: number,
    updateArticleDto: UpdateArticleDto,
  ): Promise<UpdateArticleResult> {
    const viewerId = BigInt(userId);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!article) {
        return { status: 'not_found' };
      }

      if (article.userId !== viewerId) {
        return { status: 'forbidden' };
      }

      const data: Prisma.ArticleUpdateInput = {
        ...(updateArticleDto.title !== undefined && {
          title: updateArticleDto.title,
        }),
        ...(updateArticleDto.contents !== undefined && {
          contents: updateArticleDto.contents,
        }),
        ...(updateArticleDto.category !== undefined && {
          category: updateArticleDto.category,
        }),
      };

      const updated = await tx.article.update({
        where: { id: article.id },
        data,
        select: {
          id: true,
          updatedAt: true,
        },
      });

      if (updateArticleDto.photoUrls !== undefined) {
        await tx.articlePhoto.updateMany({
          where: {
            articleId: article.id,
            deletedAt: null,
          },
          data: { deletedAt: now },
        });

        if (updateArticleDto.photoUrls.length > 0) {
          await tx.articlePhoto.createMany({
            data: updateArticleDto.photoUrls.map((photoUrl) => ({
              articleId: article.id,
              photoUrl,
            })),
          });
        }
      }

      return {
        status: 'success',
        article: updated,
      };
    });
  }

  async pinArticle(
    userId: number,
    clubId: number,
    articleId: number,
    isPinned: boolean,
  ): Promise<PinArticleResult> {
    const viewerId = BigInt(userId);

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
        },
      });

      if (!article) {
        return { status: 'not_found' };
      }

      const hostMembership = await tx.clubUser.findFirst({
        where: {
          clubId: article.clubId,
          userId: viewerId,
          authority: ClubAuthority.HOST,
          status: 'ACTIVE',
          leftAt: null,
        },
        select: { id: true },
      });

      if (!hostMembership) {
        return { status: 'forbidden' };
      }

      const updated = await tx.article.update({
        where: { id: article.id },
        data: { isPinned },
        select: {
          id: true,
          isPinned: true,
          updatedAt: true,
        },
      });

      return {
        status: 'success',
        article: updated,
      };
    });
  }

  async deleteArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<DeleteArticleResult> {
    const viewerId = BigInt(userId);
    const deletedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          clubId: true,
          club: {
            select: {
              hostId: true,
            },
          },
        },
      });

      if (!article) {
        return { status: 'not_found' };
      }

      const isAuthor = article.userId === viewerId;
      const isClubHostByOwner = article.club.hostId === viewerId;
      const hostMembership =
        isAuthor || isClubHostByOwner
          ? null
          : await tx.clubUser.findFirst({
              where: {
                clubId: article.clubId,
                userId: viewerId,
                authority: ClubAuthority.HOST,
                status: 'ACTIVE',
                leftAt: null,
              },
              select: {
                id: true,
              },
            });

      if (!isAuthor && !isClubHostByOwner && !hostMembership) {
        return { status: 'forbidden' };
      }

      const deleted = await tx.article.update({
        where: { id: article.id },
        data: { deletedAt },
        select: {
          id: true,
          deletedAt: true,
        },
      });

      return {
        status: 'success',
        article: {
          id: deleted.id,
          deletedAt: deleted.deletedAt ?? deletedAt,
        },
      };
    });
  }

  async likeArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<LikeArticleResult> {
    const viewerId = BigInt(userId);

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          likes: true,
          userId: true,
          user: {
            select: {
              nickname: true,
            },
          },
          club: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!article) {
        return { status: 'not_found' };
      }

      const sender = await tx.user.findUnique({
        where: {
          id: viewerId,
        },
        select: {
          nickname: true,
        },
      });

      const existingLike = await tx.articleLike.findUnique({
        where: {
          articleId_userId: {
            articleId: article.id,
            userId: viewerId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingLike) {
        return {
          status: 'success',
          article,
          sender,
          created: false,
        };
      }

      await tx.articleLike.create({
        data: {
          articleId: article.id,
          userId: viewerId,
        },
      });

      const updated = await tx.article.update({
        where: { id: article.id },
        data: { likes: { increment: 1 } },
        select: {
          id: true,
          clubId: true,
          likes: true,
          userId: true,
          user: {
            select: {
              nickname: true,
            },
          },
          club: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        status: 'success',
        article: updated,
        sender,
        created: true,
      };
    });
  }

  async unlikeArticle(
    userId: number,
    clubId: number,
    articleId: number,
  ): Promise<UnlikeArticleResult> {
    const viewerId = BigInt(userId);

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: {
          id: BigInt(articleId),
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        select: {
          id: true,
          likes: true,
        },
      });

      if (!article) {
        return { status: 'not_found' };
      }

      const existingLike = await tx.articleLike.findUnique({
        where: {
          articleId_userId: {
            articleId: article.id,
            userId: viewerId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!existingLike) {
        return {
          status: 'success',
          article,
        };
      }

      await tx.articleLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      const updated = await tx.article.update({
        where: { id: article.id },
        data: { likes: { decrement: 1 } },
        select: {
          id: true,
          likes: true,
        },
      });

      return {
        status: 'success',
        article: updated,
      };
    });
  }

  async findArchivePhotos(
    clubId: number,
    params: {
      sort: ArticleSort;
      cursor?: bigint;
      take: number;
    },
  ): Promise<
    Array<{ id: bigint; photoUrl: string; articleId: bigint; createdAt: Date }>
  > {
    return this.prisma.articlePhoto.findMany({
      where: {
        article: {
          clubId: BigInt(clubId),
          deletedAt: null,
        },
        deletedAt: null,
      },
      take: params.take,
      orderBy:
        params.sort === 'popular'
          ? [
              { article: { likes: 'desc' } },
              { createdAt: 'desc' },
              { id: 'desc' },
            ]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(params.cursor && {
        cursor: { id: params.cursor },
        skip: 1,
      }),
      select: {
        id: true,
        photoUrl: true,
        articleId: true,
        createdAt: true,
      },
    });
  }
}
