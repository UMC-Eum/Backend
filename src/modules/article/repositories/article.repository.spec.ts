import { ClubAuthority } from '@prisma/client';
import { ArticleRepository } from './article.repository';

describe('ArticleRepository', () => {
  let repository: ArticleRepository;

  const articleModel = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const clubUserModel = {
    findFirst: jest.fn(),
  };
  const clubModel = {
    findFirst: jest.fn(),
  };
  type TransactionMock = {
    article: typeof articleModel;
    clubUser: typeof clubUserModel;
  };
  const prisma = {
    $transaction: jest.fn(
      <T>(callback: (tx: TransactionMock) => T): T =>
        callback({
          article: articleModel,
          clubUser: clubUserModel,
        }),
    ),
    article: articleModel,
    club: clubModel,
    clubUser: clubUserModel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ArticleRepository(prisma as never);

    articleModel.update.mockResolvedValue({
      id: BigInt(10),
      deletedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
  });

  describe('existsActiveClubUser', () => {
    it('returns true when active club user exists', async () => {
      clubUserModel.findFirst.mockResolvedValue({ id: BigInt(1) });

      const result = await repository.existsActiveClubUser(1, 20);

      expect(result).toBe(true);
      expect(clubUserModel.findFirst).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          clubId: BigInt(20),
          status: 'ACTIVE',
          leftAt: null,
        },
        select: {
          id: true,
        },
      });
    });

    it('returns false when active club user does not exist', async () => {
      clubUserModel.findFirst.mockResolvedValue(null);

      await expect(repository.existsActiveClubUser(1, 20)).resolves.toBe(false);
    });
  });

  describe('findArticlesByClub', () => {
    it('filters out soft-deleted article photos', async () => {
      articleModel.findMany.mockResolvedValue([]);

      await repository.findArticlesByClub(20, {
        sort: 'recent',
        take: 20,
      });

      expect(articleModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            articlePhotos: expect.objectContaining({
              where: { deletedAt: null },
            }),
          }),
        }),
      );
    });
  });

  describe('pinArticle', () => {
    beforeEach(() => {
      articleModel.update.mockResolvedValue({
        id: BigInt(10),
        isPinned: true,
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      });
    });

    it('allows active club user with HOST authority to pin the article', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        clubId: BigInt(20),
      });
      clubUserModel.findFirst.mockResolvedValue({ id: BigInt(30) });

      const result = await repository.pinArticle(2, 20, 10, true);

      expect(result.status).toBe('success');
      expect(clubUserModel.findFirst).toHaveBeenCalledWith({
        where: {
          clubId: BigInt(20),
          userId: BigInt(2),
          authority: ClubAuthority.HOST,
          status: 'ACTIVE',
          leftAt: null,
        },
        select: { id: true },
      });
      expect(articleModel.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { isPinned: true },
        select: {
          id: true,
          isPinned: true,
          updatedAt: true,
        },
      });
    });

    it('rejects the article author when they are not a HOST club user', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        clubId: BigInt(20),
      });
      clubUserModel.findFirst.mockResolvedValue(null);

      const result = await repository.pinArticle(1, 20, 10, true);

      expect(result).toEqual({ status: 'forbidden' });
      expect(articleModel.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteArticle', () => {
    it('allows the article author to delete the article', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        userId: BigInt(1),
        clubId: BigInt(20),
        club: { hostId: BigInt(2) },
      });

      const result = await repository.deleteArticle(1, 20, 10);

      expect(result.status).toBe('success');
      expect(articleModel.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { deletedAt: expect.any(Date) as Date },
        select: {
          id: true,
          deletedAt: true,
        },
      });
      expect(clubUserModel.findFirst).not.toHaveBeenCalled();
    });

    it('allows the club host owner to delete another user article', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        userId: BigInt(1),
        clubId: BigInt(20),
        club: { hostId: BigInt(2) },
      });

      const result = await repository.deleteArticle(2, 20, 10);

      expect(result.status).toBe('success');
      expect(articleModel.update).toHaveBeenCalledTimes(1);
      expect(clubUserModel.findFirst).not.toHaveBeenCalled();
    });

    it('allows a club user with HOST authority to delete another user article', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        userId: BigInt(1),
        clubId: BigInt(20),
        club: { hostId: null },
      });
      clubUserModel.findFirst.mockResolvedValue({ id: BigInt(30) });

      const result = await repository.deleteArticle(2, 20, 10);

      expect(result.status).toBe('success');
      expect(clubUserModel.findFirst).toHaveBeenCalledWith({
        where: {
          clubId: BigInt(20),
          userId: BigInt(2),
          authority: ClubAuthority.HOST,
          status: 'ACTIVE',
          leftAt: null,
        },
        select: {
          id: true,
        },
      });
      expect(articleModel.update).toHaveBeenCalledTimes(1);
    });

    it('rejects a non-author who is not a club host', async () => {
      articleModel.findFirst.mockResolvedValue({
        id: BigInt(10),
        userId: BigInt(1),
        clubId: BigInt(20),
        club: { hostId: BigInt(3) },
      });
      clubUserModel.findFirst.mockResolvedValue(null);

      const result = await repository.deleteArticle(2, 20, 10);

      expect(result).toEqual({ status: 'forbidden' });
      expect(articleModel.update).not.toHaveBeenCalled();
    });
  });
});
