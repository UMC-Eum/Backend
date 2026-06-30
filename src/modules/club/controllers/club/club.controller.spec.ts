import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubCategory } from '@prisma/client';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ClubListSort } from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';
import { ClubController } from './club.controller';

describe('ClubController', () => {
  let controller: ClubController;
  const listClubs = jest.fn();
  const listTopHosts = jest.fn();
  const getClubDetail = jest.fn();
  const likeClub = jest.fn();
  const unlikeClub = jest.fn();
  const createClub = jest.fn();
  const updateClub = jest.fn();
  const deleteClub = jest.fn();

  beforeEach(async () => {
    listClubs.mockReset();
    listTopHosts.mockReset();
    getClubDetail.mockReset();
    likeClub.mockReset();
    unlikeClub.mockReset();
    createClub.mockReset();
    updateClub.mockReset();
    deleteClub.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubController],
      providers: [
        {
          provide: ClubService,
          useValue: {
            listClubs,
            listTopHosts,
            getClubDetail,
            likeClub,
            unlikeClub,
            createClub,
            updateClub,
            deleteClub,
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
      category: ClubCategory.OUTDOOR,
      sort: ClubListSort.RECENT,
      limit: 10,
    };
    const response = { nextCursor: null, items: [] };
    listClubs.mockResolvedValue(response);

    await expect(controller.listClubs(7, query)).resolves.toBe(response);
    expect(listClubs).toHaveBeenCalledWith(7, query);
  });

  it('클럽 생성을 service에 위임한다', async () => {
    const dto = {
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      introText: '목소리로 친해져요',
      introVoice: 'https://cdn.example.com/voice/12.mp3',
      capacity: 30,
      keywordIds: [1, 4, 7],
    };
    const response = {
      clubId: 12,
      code: '1100000000',
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      capacity: 30,
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
      category: ClubCategory.OUTDOOR,
      introText: '더 즐겁게 모여요',
      introVoice: null,
      capacity: 60,
      keywords: ['등산'],
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

  it('클럽 상세 조회를 service에 위임한다', async () => {
    const response = {
      clubId: '12',
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoice: null,
      introText: '등산으로 친해져요',
      capacity: 30,
      memberCount: 18,
      likes: 142,
      isLiked: true,
      isJoined: true,
      myAuthority: ClubAuthority.HOST,
      host: null,
      keywords: [],
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
