import { Test, TestingModule } from '@nestjs/testing';
import {
  ActiveStatus,
  ClubAuthority,
  ClubCategory,
  ClubUserStatus,
} from '@prisma/client';
import { ClubService } from './club.service';
import { ClubRepository } from '../../repositories/club.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { ClubListSort } from '../../dtos/club.dto';

describe('ClubService', () => {
  let service: ClubService;
  const findManyForList = jest.fn();
  const findTopHosts = jest.fn();
  const findDetailById = jest.fn();
  const findClubUserState = jest.fn();
  const hasClubLike = jest.fn();
  const createClubLike = jest.fn();
  const deleteClubLike = jest.fn();

  const baseClubRow = {
    id: 12n,
    hostId: 7n,
    name: '등산 러버즈',
    category: ClubCategory.OUTDOOR,
    introVoiceUrl: 'https://cdn.example.com/voice/12.mp3',
    introText: '등산으로 친해져요',
    capacity: 30,
    likes: 142,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    user: {
      id: 7n,
      nickname: '보이스마스터',
      profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      deletedAt: null,
      status: ActiveStatus.ACTIVE,
    },
    clubKeywords: [
      { personality: { body: '야외' } },
      { personality: { body: '등산' } },
    ],
    meetings: [{ id: 88n, name: '주간 정모', date: 'FRI 20:00:00' }],
    _count: { clubUsers: 18 },
  };

  beforeEach(async () => {
    findManyForList.mockReset();
    findTopHosts.mockReset();
    findDetailById.mockReset();
    findClubUserState.mockReset();
    hasClubLike.mockReset();
    createClubLike.mockReset();
    deleteClubLike.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubService,
        {
          provide: ClubRepository,
          useValue: {
            findManyForList,
            findTopHosts,
            findDetailById,
            findClubUserState,
            hasClubLike,
            createClubLike,
            deleteClubLike,
          },
        },
      ],
    }).compile();

    service = module.get<ClubService>(ClubService);
  });

  it('클럽 목록을 DTO로 변환하고 다음 커서를 반환한다', async () => {
    findManyForList.mockResolvedValue([
      {
        id: 12n,
        name: '등산 러버즈',
        introText: '등산으로 친해져요',
        category: ClubCategory.OUTDOOR,
        thumbnailUrl: 'https://cdn.example.com/clubs/12.jpg',
        likes: 142,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        clubKeywords: [{ personality: { body: '등산' } }],
        _count: { clubUsers: 18 },
      },
      {
        id: 11n,
        name: '러닝 클럽',
        introText: null,
        category: ClubCategory.SPORTS,
        thumbnailUrl: null,
        likes: 100,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        clubKeywords: [{ personality: { body: '러닝' } }],
        _count: { clubUsers: 9 },
      },
    ]);

    const result = await service.listClubs({
      sort: ClubListSort.POPULAR,
      limit: 1,
    });

    expect(findManyForList).toHaveBeenCalledWith({
      keyword: undefined,
      category: undefined,
      sort: ClubListSort.POPULAR,
      cursor: undefined,
      limit: 1,
    });
    expect(result.items).toEqual([
      {
        clubId: '12',
        name: '등산 러버즈',
        introText: '등산으로 친해져요',
        category: ClubCategory.OUTDOOR,
        thumbnailUrl: 'https://cdn.example.com/clubs/12.jpg',
        likes: 142,
        memberCount: 18,
        keywords: ['등산'],
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ]);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('top host 목록을 DTO로 변환한다', async () => {
    findTopHosts.mockResolvedValue([
      {
        hostId: 42n,
        hostName: '김등산',
        profileImageUrl: null,
        clubCount: 5,
        totalLikes: 123,
      },
    ]);

    await expect(service.listTopHosts(10)).resolves.toEqual({
      hosts: [
        {
          hostId: '42',
          name: '김등산',
          profileImageUrl: null,
          clubCount: 5,
          totalLikes: 123,
        },
      ],
    });
    expect(findTopHosts).toHaveBeenCalledWith(10);
  });

  it('클럽이 없으면 CLUB_NOT_FOUND', async () => {
    findDetailById.mockResolvedValue(null);

    await expect(service.getClubDetail(3, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
  });

  it('클럽 상세를 반환한다', async () => {
    findDetailById.mockResolvedValue(baseClubRow);
    findClubUserState.mockResolvedValue({
      authority: ClubAuthority.GENERAL,
      status: ClubUserStatus.ACTIVE,
      leftAt: null,
    });
    hasClubLike.mockResolvedValue(false);

    const result = await service.getClubDetail(9, 12);

    expect(result).toEqual({
      clubId: '12',
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoice: 'https://cdn.example.com/voice/12.mp3',
      introText: '등산으로 친해져요',
      capacity: 30,
      memberCount: 18,
      likes: 142,
      isLiked: false,
      isJoined: true,
      myAuthority: ClubAuthority.GENERAL,
      host: {
        userId: '7',
        nickname: '보이스마스터',
        profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      },
      keywords: ['야외', '등산'],
      meetings: [
        {
          meetingId: '88',
          name: '주간 정모',
          day: 'FRI',
          time: '20:00:00',
        },
      ],
      createdAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('호스트면 ClubUser 상태보다 HOST 권한을 우선한다', async () => {
    findDetailById.mockResolvedValue(baseClubRow);
    findClubUserState.mockResolvedValue({
      authority: ClubAuthority.GENERAL,
      status: ClubUserStatus.ACTIVE,
      leftAt: null,
    });
    hasClubLike.mockResolvedValue(false);

    const result = await service.getClubDetail(7, 12);

    expect(result.isJoined).toBe(true);
    expect(result.myAuthority).toBe(ClubAuthority.HOST);
  });

  it('한국어 정모 일정을 요일/시간으로 구조화한다', async () => {
    findDetailById.mockResolvedValue({
      ...baseClubRow,
      meetings: [{ id: 88n, name: '주간 정모', date: '매주 목요일 저녁 19시' }],
    });
    findClubUserState.mockResolvedValue(null);
    hasClubLike.mockResolvedValue(false);

    const result = await service.getClubDetail(9, 12);

    expect(result.meetings).toEqual([
      {
        meetingId: '88',
        name: '주간 정모',
        day: 'THU',
        time: '19:00:00',
      },
    ]);
  });

  it('클럽 좋아요 생성 결과를 반환한다', async () => {
    createClubLike.mockResolvedValue({
      clubId: 12n,
      likeCount: 143,
      isDuplicate: false,
    });

    await expect(service.likeClub(7, 12)).resolves.toEqual({
      clubId: '12',
      isLiked: true,
      likeCount: 143,
    });
    expect(createClubLike).toHaveBeenCalledWith(12n, 7n);
  });

  it('이미 좋아요한 클럽이면 CLUB_LIKE_ALREADY_EXISTS', async () => {
    createClubLike.mockResolvedValue({
      clubId: 12n,
      likeCount: 143,
      isDuplicate: true,
    });

    await expect(service.likeClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_LIKE_ALREADY_EXISTS',
    } satisfies Partial<AppException>);
  });

  it('좋아요할 클럽이 없으면 CLUB_NOT_FOUND', async () => {
    createClubLike.mockResolvedValue(null);

    await expect(service.likeClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
  });

  it('클럽 좋아요 취소 결과를 반환한다', async () => {
    deleteClubLike.mockResolvedValue({
      clubId: 12n,
      likeCount: 142,
      isMissing: false,
    });

    await expect(service.unlikeClub(7, 12)).resolves.toEqual({
      clubId: '12',
      isLiked: false,
      likeCount: 142,
    });
    expect(deleteClubLike).toHaveBeenCalledWith(12n, 7n);
  });

  it('좋아요 취소할 기록이 없으면 CLUB_LIKE_NOT_FOUND', async () => {
    deleteClubLike.mockResolvedValue({
      clubId: 12n,
      likeCount: 142,
      isMissing: true,
    });

    await expect(service.unlikeClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_LIKE_NOT_FOUND',
    } satisfies Partial<AppException>);
  });

  it('좋아요 취소할 클럽이 없으면 CLUB_NOT_FOUND', async () => {
    deleteClubLike.mockResolvedValue(null);

    await expect(service.unlikeClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
  });
});
