import { Test, TestingModule } from '@nestjs/testing';
import { AppException } from '../../../../common/errors/app.exception';
import { REDIS_CLIENT } from '../../../../infra/redis/redis.module';
import { RecentClubSearchService } from './recent-club-search.service';

describe('RecentClubSearchService', () => {
  let service: RecentClubSearchService;
  const zadd = jest.fn();
  const zremrangebyrank = jest.fn();
  const expire = jest.fn();
  const exec = jest.fn();
  const multi = jest.fn();
  const zrevrange = jest.fn();
  const zrem = jest.fn();
  const del = jest.fn();

  beforeEach(async () => {
    zadd.mockReset();
    zremrangebyrank.mockReset();
    expire.mockReset();
    exec.mockReset();
    multi.mockReset();
    zrevrange.mockReset();
    zrem.mockReset();
    del.mockReset();

    const chain = {
      zadd,
      zremrangebyrank,
      expire,
      exec,
    };

    zadd.mockReturnValue(chain);
    zremrangebyrank.mockReturnValue(chain);
    expire.mockReturnValue(chain);
    exec.mockResolvedValue([]);
    multi.mockReturnValue(chain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecentClubSearchService,
        {
          provide: REDIS_CLIENT,
          useValue: {
            multi,
            zrevrange,
            zrem,
            del,
          },
        },
      ],
    }).compile();

    service = module.get<RecentClubSearchService>(RecentClubSearchService);
  });

  it('최근 검색어 저장 시 Redis Sorted Set 명령을 실행한다', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1783060000000);

    await service.addRecentSearch(12, ' 축구 ');

    expect(multi).toHaveBeenCalledTimes(1);
    expect(zadd).toHaveBeenCalledWith(
      'recent-search:club:user:12',
      1783060000000,
      '축구',
    );
    expect(zremrangebyrank).toHaveBeenCalledWith(
      'recent-search:club:user:12',
      0,
      -11,
    );
    expect(expire).toHaveBeenCalledWith(
      'recent-search:club:user:12',
      60 * 60 * 24 * 30,
    );
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('같은 keyword 저장도 동일 member의 score 갱신 흐름을 사용한다', async () => {
    await service.addRecentSearch(12, '러닝');
    await service.addRecentSearch(12, '러닝');

    expect(zadd).toHaveBeenCalledTimes(2);
    expect(zadd).toHaveBeenNthCalledWith(
      1,
      'recent-search:club:user:12',
      expect.any(Number),
      '러닝',
    );
    expect(zadd).toHaveBeenNthCalledWith(
      2,
      'recent-search:club:user:12',
      expect.any(Number),
      '러닝',
    );
  });

  it('빈 keyword는 저장하지 않는다', async () => {
    await service.addRecentSearch(12, '   ');

    expect(multi).not.toHaveBeenCalled();
  });

  it('최근 검색어를 최신순으로 조회한다', async () => {
    zrevrange.mockResolvedValue(['축구', '러닝']);

    await expect(service.getRecentSearches(12)).resolves.toEqual([
      '축구',
      '러닝',
    ]);
    expect(zrevrange).toHaveBeenCalledWith('recent-search:club:user:12', 0, 9);
  });

  it('단건 삭제 시 Redis ZREM을 호출한다', async () => {
    zrem.mockResolvedValue(1);

    await service.deleteRecentSearch(12, ' 축구 ');

    expect(zrem).toHaveBeenCalledWith('recent-search:club:user:12', '축구');
  });

  it('전체 삭제 시 Redis DEL을 호출한다', async () => {
    del.mockResolvedValue(1);

    await service.clearRecentSearches(12);

    expect(del).toHaveBeenCalledWith('recent-search:club:user:12');
  });

  it('조회 Redis 실패는 프로젝트 예외로 변환한다', async () => {
    zrevrange.mockRejectedValue(new Error('redis unavailable'));

    await expect(service.getRecentSearches(12)).rejects.toMatchObject({
      internalCode: 'SERVER_TEMPORARY_ERROR',
    } satisfies Partial<AppException>);
  });
});
