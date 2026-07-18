import { ActiveStatus, type Prisma } from '@prisma/client';
import { HeartRepository } from './heart.repository';

describe('HeartRepository', () => {
  let repository: HeartRepository;

  const heartModel = {
    findMany: jest.fn<Promise<unknown[]>, [Prisma.HeartFindManyArgs]>(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const userModel = {
    findFirst: jest.fn(),
  };
  const prisma = {
    heart: heartModel,
    user: userModel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new HeartRepository(prisma as never);
  });

  describe('postHeart', () => {
    it('로그인 유저가 대상 유저에게 하트를 보내면 sentById, sentToId가 모두 저장된다', async () => {
      userModel.findFirst.mockResolvedValue({ id: 24n });
      heartModel.findFirst.mockResolvedValue(null);
      heartModel.create.mockResolvedValue({
        id: 101n,
        createdAt: new Date('2026-07-04T00:00:00.000Z'),
      });

      const result = await repository.postHeart('7', '24');

      expect(result).toEqual({
        ok: true,
        heart: {
          heartId: 101,
          createdAt: '2026-07-04T00:00:00.000Z',
        },
      });
      expect(userModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 24n,
          status: ActiveStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(heartModel.create).toHaveBeenCalledWith({
        data: {
          sentById: 7n,
          sentToId: 24n,
          status: ActiveStatus.ACTIVE,
        },
      });
    });

    it('대상 유저 id가 유효하지 않으면 생성하지 않는다', async () => {
      const result = await repository.postHeart('7', '0');

      expect(result).toEqual({ ok: false, reason: 'INVALID_USER_ID' });
      expect(heartModel.create).not.toHaveBeenCalled();
    });

    it('삭제되었거나 비활성인 대상 유저는 존재하지 않는 대상으로 처리한다', async () => {
      userModel.findFirst.mockResolvedValue(null);

      const result = await repository.postHeart('7', '24');

      expect(result).toEqual({ ok: false, reason: 'TARGET_NOT_FOUND' });
      expect(heartModel.create).not.toHaveBeenCalled();
    });

    it('같은 유저에게 ACTIVE Heart를 중복 생성하지 않는다', async () => {
      userModel.findFirst.mockResolvedValue({ id: 24n });
      heartModel.findFirst.mockResolvedValueOnce({ id: 1n });

      const result = await repository.postHeart('7', '24');

      expect(result).toEqual({ ok: false, reason: 'ALREADY_EXISTS' });
      expect(heartModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getReceivedHeartsByUserId', () => {
    it('sentById가 null인 Heart row도 조회 후보에 포함한다', async () => {
      heartModel.findMany.mockResolvedValue([]);

      await repository.getReceivedHeartsByUserId({ userId: '11', size: 20 });

      expect(heartModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sentToId: 11n,
            status: ActiveStatus.ACTIVE,
            deletedAt: null,
          },
        }),
      );
    });

    it('sentById가 null인 item은 fromUserId null로 매핑한다', async () => {
      heartModel.findMany.mockResolvedValue([
        {
          id: 29n,
          sentById: null,
          sentToId: 11n,
          createdAt: new Date('2026-07-04T02:50:18.949Z'),
        },
        {
          id: 24n,
          sentById: 174n,
          sentToId: 11n,
          createdAt: new Date('2026-07-04T02:08:32.165Z'),
        },
      ]);

      const result = await repository.getReceivedHeartsByUserId({
        userId: '11',
        size: 20,
      });

      expect(result).toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 29,
            fromUserId: null,
            createdAt: '2026-07-04T02:50:18.949Z',
          },
          {
            heartId: 24,
            fromUserId: 174,
            createdAt: '2026-07-04T02:08:32.165Z',
          },
        ],
      });
    });
  });

  describe('getSentHeartsByUserId', () => {
    it('sentToId가 null인 item은 targetUserId null로 매핑한다', async () => {
      heartModel.findMany.mockResolvedValue([
        {
          id: 30n,
          sentById: 174n,
          sentToId: null,
          createdAt: new Date('2026-07-04T02:52:31.680Z'),
        },
      ]);

      const result = await repository.getSentHeartsByUserId({
        userId: '174',
        size: 20,
      });

      expect(result).toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 30,
            targetUserId: null,
            createdAt: '2026-07-04T02:52:31.680Z',
          },
        ],
      });
    });
  });
});
