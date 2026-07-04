import { Test, TestingModule } from '@nestjs/testing';
import { AppException } from '../../../../common/errors/app.exception';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { RecentClubSearchService } from './recent-club-search.service';

describe('RecentClubSearchService', () => {
  let service: RecentClubSearchService;
  const createMany = jest.fn();
  const findMany = jest.fn();
  const deleteMany = jest.fn();
  const transaction = jest.fn();
  type TransactionCallback = (tx: {
    recentSearchKeyword: {
      createMany: typeof createMany;
      findMany: typeof findMany;
      deleteMany: typeof deleteMany;
    };
  }) => Promise<unknown>;

  beforeEach(async () => {
    createMany.mockReset();
    findMany.mockReset();
    deleteMany.mockReset();
    transaction.mockReset();

    transaction.mockImplementation((callback: TransactionCallback) =>
      callback({
        recentSearchKeyword: {
          createMany,
          findMany,
          deleteMany,
        },
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecentClubSearchService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transaction,
            recentSearchKeyword: {
              findMany,
              deleteMany,
            },
          },
        },
      ],
    }).compile();

    service = module.get<RecentClubSearchService>(RecentClubSearchService);
  });

  it('최근 검색어 저장 시 중복을 건너뛰고 30개 초과분을 정리한다', async () => {
    findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
    deleteMany.mockResolvedValue({ count: 2 });

    await service.addRecentSearch(12, ' 축구 ');

    expect(createMany).toHaveBeenCalledWith({
      data: {
        userId: 12n,
        keyword: '축구',
      },
      skipDuplicates: true,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 12n },
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 30,
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1n, 2n] },
      },
    });
  });

  it('30개 초과 검색어가 없으면 삭제하지 않는다', async () => {
    findMany.mockResolvedValue([]);

    await service.addRecentSearch(12, '러닝');

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('빈 keyword는 저장하지 않는다', async () => {
    await service.addRecentSearch(12, '   ');

    expect(transaction).not.toHaveBeenCalled();
  });

  it('최근 검색어를 최신순으로 조회한다', async () => {
    findMany.mockResolvedValue([{ keyword: '축구' }, { keyword: '러닝' }]);

    await expect(service.getRecentSearches(12)).resolves.toEqual([
      '축구',
      '러닝',
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 12n },
      select: { keyword: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
    });
  });

  it('단건 삭제 시 keyword를 trim 처리해서 삭제한다', async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    await service.deleteRecentSearch(12, ' 축구 ');

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 12n,
        keyword: '축구',
      },
    });
  });

  it('전체 삭제 시 해당 유저 검색어를 모두 삭제한다', async () => {
    deleteMany.mockResolvedValue({ count: 3 });

    await service.clearRecentSearches(12);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: 12n },
    });
  });

  it('조회 DB 실패는 프로젝트 예외로 변환한다', async () => {
    findMany.mockRejectedValue(new Error('db unavailable'));

    await expect(service.getRecentSearches(12)).rejects.toMatchObject({
      internalCode: 'SERVER_TEMPORARY_ERROR',
    } satisfies Partial<AppException>);
  });
});
