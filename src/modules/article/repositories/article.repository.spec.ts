import { ClubAuthority } from '@prisma/client';
import { ArticleRepository } from './article.repository';

describe('ArticleRepository', () => {
  let repository: ArticleRepository;

  const articleModel = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const clubUserModel = {
    findFirst: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((callback) =>
      callback({
        article: articleModel,
        clubUser: clubUserModel,
      }),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ArticleRepository(prisma as never);

    articleModel.update.mockResolvedValue({
      id: BigInt(10),
      deletedAt: new Date('2026-01-10T00:00:00.000Z'),
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
        data: { deletedAt: expect.any(Date) },
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
