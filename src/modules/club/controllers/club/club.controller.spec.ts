import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubCategory } from '@prisma/client';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ClubJoinPolicy, ClubListSort } from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';
import { RecentClubSearchService } from '../../services/club/recent-club-search.service';
import { ClubController } from './club.controller';

describe('ClubController', () => {
  let controller: ClubController;
  const listClubs = jest.fn();
  const listTopHosts = jest.fn();
  const listTodayRecommendedClubs = jest.fn();
  const getClubDetail = jest.fn();
  const likeClub = jest.fn();
  const unlikeClub = jest.fn();
  const createClub = jest.fn();
  const updateClub = jest.fn();
  const deleteClub = jest.fn();
  const addRecentSearch = jest.fn();

  beforeEach(async () => {
    listClubs.mockReset();
    listTopHosts.mockReset();
    listTodayRecommendedClubs.mockReset();
    getClubDetail.mockReset();
    likeClub.mockReset();
    unlikeClub.mockReset();
    createClub.mockReset();
    updateClub.mockReset();
    deleteClub.mockReset();
    addRecentSearch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubController],
      providers: [
        {
          provide: ClubService,
          useValue: {
            listClubs,
            listTopHosts,
            listTodayRecommendedClubs,
            getClubDetail,
            likeClub,
            unlikeClub,
            createClub,
            updateClub,
            deleteClub,
          },
        },
        {
          provide: RecentClubSearchService,
          useValue: {
            addRecentSearch,
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClubController>(ClubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('클럽 목록 조회를 service에 위임한다', async () => {
    const query = {
      keyword: '등산',
      category: ClubCategory.HOBBY,
      sort: ClubListSort.RECENT,
      limit: 10,
    };
    const response = { nextCursor: null, items: [] };
    listClubs.mockResolvedValue(response);

    await expect(controller.listClubs(7, query)).resolves.toBe(response);
    expect(listClubs).toHaveBeenCalledWith(7, query);
    expect(addRecentSearch).toHaveBeenCalledWith(7, '등산');
  });

  it('keyword가 없으면 최근 검색어를 저장하지 않는다', async () => {
    const query = {
      sort: ClubListSort.RECENT,
      limit: 10,
    };
    const response = { nextCursor: null, items: [] };
    listClubs.mockResolvedValue(response);

    await expect(controller.listClubs(7, query)).resolves.toBe(response);
    expect(addRecentSearch).not.toHaveBeenCalled();
  });

  it('keyword가 빈 문자열이면 최근 검색어를 저장하지 않는다', async () => {
    const query = {
      keyword: '   ',
      sort: ClubListSort.RECENT,
      limit: 10,
    };
    const response = { nextCursor: null, items: [] };
    listClubs.mockResolvedValue(response);

    await expect(controller.listClubs(7, query)).resolves.toBe(response);
    expect(addRecentSearch).not.toHaveBeenCalled();
  });

  it('최근 검색어 저장 실패가 클럽 목록 조회 실패로 전파되지 않는다', async () => {
    const query = {
      keyword: '등산',
      sort: ClubListSort.RECENT,
      limit: 10,
    };
    const response = { nextCursor: null, items: [] };
    listClubs.mockResolvedValue(response);
    addRecentSearch.mockRejectedValue(new Error('redis unavailable'));

    await expect(controller.listClubs(7, query)).resolves.toBe(response);
    expect(addRecentSearch).toHaveBeenCalledWith(7, '등산');
  });

  it('클럽 생성을 service에 위임한다', async () => {
    const dto = {
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      introText: '목소리로 친해져요',
      capacity: 30,
      areaCode: '1168000000',
      approvalRequired: false,
      boardPublic: true,
      thumbnailUrl: 'https://cdn.example.com/clubs/12/thumbnail.jpg',
      imageUrls: [
        'https://cdn.example.com/clubs/12/images/1.jpg',
        'https://cdn.example.com/clubs/12/images/2.jpg',
      ],
    };
    const response = {
      clubId: 12,
      code: '1168000000',
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      capacity: 30,
      areaCode: '1168000000',
      thumbnailUrl: 'https://cdn.example.com/clubs/12/thumbnail.jpg',
      imageUrls: [
        'https://cdn.example.com/clubs/12/images/1.jpg',
        'https://cdn.example.com/clubs/12/images/2.jpg',
      ],
      approvalRequired: false,
      boardPublic: true,
      memberCount: 1,
      host: {
        userId: 7,
        nickname: '보이스마스터',
        profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      },
      createdAt: '2026-05-01T16:35:00.000Z',
    };
    createClub.mockResolvedValue(response);

    await expect(controller.createClub(7, dto)).resolves.toBe(response);
    expect(createClub).toHaveBeenCalledWith(7, dto);
  });

  it('클럽 수정을 service에 위임한다', async () => {
    const dto = {
      name: '등산 러버즈 시즌3',
      capacity: 60,
    };
    const response = {
      clubId: '12',
      name: '등산 러버즈 시즌3',
      category: ClubCategory.HOBBY,
      introText: '더 즐겁게 모여요',
      introVoice: null,
      capacity: 60,
      updatedAt: '2026-05-01T20:25:00.000Z',
    };
    updateClub.mockResolvedValue(response);

    await expect(controller.updateClub(7, 12, dto)).resolves.toBe(response);
    expect(updateClub).toHaveBeenCalledWith(7, 12, dto);
  });

  it('클럽 삭제를 service에 위임한다', async () => {
    const response = {
      clubId: '12',
      deletedAt: '2026-05-01T18:50:00.000Z',
    };
    deleteClub.mockResolvedValue(response);

    await expect(controller.deleteClub(7, 12)).resolves.toBe(response);
    expect(deleteClub).toHaveBeenCalledWith(7, 12);
  });

  it('top host 조회를 service에 위임한다', async () => {
    const response = {
      hosts: [
        {
          hostId: '42',
          name: '김등산',
          profileImageUrl: null,
          clubCount: 5,
          totalLikes: 123,
        },
      ],
    };
    listTopHosts.mockResolvedValue(response);

    await expect(controller.listTopHosts({ limit: 10 })).resolves.toBe(
      response,
    );
    expect(listTopHosts).toHaveBeenCalledWith(10);
  });

  it('오늘의 동호회 추천 조회를 service에 위임한다', async () => {
    const response = {
      items: [
        {
          clubId: '12',
          name: '등산 러버즈',
          category: ClubCategory.OTHERS,
          introText: '등산으로 친해져요',
          thumbnailUrl: 'https://cdn.example.com/clubs/12/thumbnail.jpg',
          capacity: 30,
          memberCount: 18,
          likes: 142,
          recommendationScore: 226,
          host: {
            userId: '7',
            nickname: '보이스마스터',
            profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
          },
        },
      ],
    };
    listTodayRecommendedClubs.mockResolvedValue(response);

    await expect(
      controller.listTodayRecommendedClubs({ limit: 10 }),
    ).resolves.toBe(response);
    expect(listTodayRecommendedClubs).toHaveBeenCalledWith(10);
  });

  it('클럽 상세 조회를 service에 위임한다', async () => {
    const response = {
      clubId: '12',
      name: '등산 러버즈',
      category: ClubCategory.HOBBY,
      introText: '등산으로 친해져요',
      capacity: 30,
      thumbnailUrl: 'https://cdn.example.com/clubs/12/thumbnail.jpg',
      clubImages: [
        {
          clubImageId: '101',
          imageUrl: 'https://cdn.example.com/clubs/12/images/1.jpg',
          sortOrder: 1,
        },
      ],
      joinPolicy: ClubJoinPolicy.AUTO,
      memberCount: 18,
      likes: 142,
      isLiked: true,
      isJoined: true,
      myAuthority: ClubAuthority.HOST,
      host: null,
      meetings: [],
      createdAt: '2026-03-01T00:00:00.000Z',
    };
    getClubDetail.mockResolvedValue(response);

    await expect(controller.getClubDetail(7, 12)).resolves.toBe(response);
    expect(getClubDetail).toHaveBeenCalledWith(7, 12);
  });

  it('클럽 좋아요를 service에 위임한다', async () => {
    const response = {
      clubId: '12',
      isLiked: true,
      likeCount: 143,
    };
    likeClub.mockResolvedValue(response);

    await expect(controller.likeClub(7, 12)).resolves.toBe(response);
    expect(likeClub).toHaveBeenCalledWith(7, 12);
  });

  it('클럽 좋아요 취소를 service에 위임한다', async () => {
    const response = {
      clubId: '12',
      isLiked: false,
      likeCount: 142,
    };
    unlikeClub.mockResolvedValue(response);

    await expect(controller.unlikeClub(7, 12)).resolves.toBe(response);
    expect(unlikeClub).toHaveBeenCalledWith(7, 12);
  });
});
