import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubCategory } from '@prisma/client';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ClubListSort } from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';
import { ClubController, UserClubController } from './club.controller';

describe('ClubController', () => {
  let controller: ClubController;
  let userClubController: UserClubController;
  const listClubs = jest.fn();
  const listMyClubs = jest.fn();
  const listTopHosts = jest.fn();
  const getClubDetail = jest.fn();
  const likeClub = jest.fn();
  const unlikeClub = jest.fn();

  beforeEach(async () => {
    listClubs.mockReset();
    listMyClubs.mockReset();
    listTopHosts.mockReset();
    getClubDetail.mockReset();
    likeClub.mockReset();
    unlikeClub.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubController, UserClubController],
      providers: [
        {
          provide: ClubService,
          useValue: {
            listClubs,
            listMyClubs,
            listTopHosts,
            getClubDetail,
            likeClub,
            unlikeClub,
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClubController>(ClubController);
    userClubController = module.get<UserClubController>(UserClubController);
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

  it('내 클럽 목록 조회를 service에 위임한다', async () => {
    const query = { cursor: 'cursor', limit: 10 };
    const response = { clubs: [], nextCursor: null };
    listMyClubs.mockResolvedValue(response);

    await expect(userClubController.listMyClubs(7, query)).resolves.toBe(
      response,
    );
    expect(listMyClubs).toHaveBeenCalledWith(7, query);
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
