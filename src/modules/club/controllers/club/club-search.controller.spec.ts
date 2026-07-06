import { Test, TestingModule } from '@nestjs/testing';
import { AppException } from '../../../../common/errors/app.exception';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RecentClubSearchService } from '../../services/club/recent-club-search.service';
import { ClubSearchController } from './club-search.controller';

describe('ClubSearchController', () => {
  let controller: ClubSearchController;
  const getRecentSearches = jest.fn();
  const deleteRecentSearch = jest.fn();
  const clearRecentSearches = jest.fn();

  beforeEach(async () => {
    getRecentSearches.mockReset();
    deleteRecentSearch.mockReset();
    clearRecentSearches.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubSearchController],
      providers: [
        {
          provide: RecentClubSearchService,
          useValue: {
            getRecentSearches,
            deleteRecentSearch,
            clearRecentSearches,
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClubSearchController>(ClubSearchController);
  });

  it('최근 검색어 목록을 반환한다', async () => {
    getRecentSearches.mockResolvedValue(['축구', '러닝']);

    await expect(controller.getRecentSearches(7)).resolves.toEqual({
      keywords: ['축구', '러닝'],
    });
    expect(getRecentSearches).toHaveBeenCalledWith(7);
  });

  it('최근 검색어 단건 삭제를 수행한다', async () => {
    deleteRecentSearch.mockResolvedValue(undefined);

    await expect(
      controller.deleteRecentSearch(7, { keyword: ' 축구 ' }),
    ).resolves.toEqual({ deletedKeyword: '축구' });
    expect(deleteRecentSearch).toHaveBeenCalledWith(7, '축구');
  });

  it('최근 검색어 단건 삭제에서 keyword가 없으면 BadRequest를 반환한다', async () => {
    const promise = controller.deleteRecentSearch(7, {});

    await expect(promise).rejects.toMatchObject({
      internalCode: 'CLUB_RECENT_SEARCH_KEYWORD_REQUIRED',
    } satisfies Partial<AppException>);
    await expect(promise).rejects.toHaveProperty('status', 400);
    expect(deleteRecentSearch).not.toHaveBeenCalled();
  });

  it('최근 검색어 단건 삭제에서 keyword가 빈 문자열이면 BadRequest를 반환한다', async () => {
    const promise = controller.deleteRecentSearch(7, { keyword: '   ' });

    await expect(promise).rejects.toMatchObject({
      internalCode: 'CLUB_RECENT_SEARCH_KEYWORD_REQUIRED',
    } satisfies Partial<AppException>);
    await expect(promise).rejects.toHaveProperty('status', 400);
    expect(deleteRecentSearch).not.toHaveBeenCalled();
  });

  it('최근 검색어 전체 삭제를 수행한다', async () => {
    clearRecentSearches.mockResolvedValue(undefined);

    await expect(controller.clearRecentSearches(7)).resolves.toEqual({
      deleted: true,
    });
    expect(clearRecentSearches).toHaveBeenCalledWith(7);
  });
});
