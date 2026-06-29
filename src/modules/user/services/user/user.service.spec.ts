import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubCategory, Sex } from '@prisma/client';
import { UserService } from './user.service';
import { UserRepository } from '../../repositories/user.repository';

describe('UserService', () => {
  let service: UserService;
  const repositoryMock = {
    findProfileById: jest.fn(),
    findAddressByCode: jest.fn(),
    findInterestsByBodies: jest.fn(),
    findPersonalitiesByBodies: jest.fn(),
    findAllPersonalities: jest.fn(),
    findMyActiveClubs: jest.fn(),
    findMyLikedClubs: jest.fn(),
    findMyLatestProfileVisitors: jest.fn(),
    findActiveUserId: jest.fn(),
    createProfileVisitLog: jest.fn(),
    updateProfile: jest.fn(),
    updateKeywords: jest.fn(),
    updatePersonalities: jest.fn(),
    updateIdealPersonalities: jest.fn(),
    deactivateProfile: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('내 ACTIVE 동호회 목록을 반환한다', async () => {
    const joinedAt = new Date('2026-05-02T15:40:00.000Z');
    repositoryMock.findMyActiveClubs.mockResolvedValue([
      {
        authority: ClubAuthority.HOST,
        joinedAt,
        club: {
          id: 12n,
          name: '테스트 동호회',
          thumbnailUrl: 'https://example.com/club.png',
          category: ClubCategory.OTHERS,
          introText: '테스트용 동호회입니다.',
          clubUsers: [{ id: 1n }, { id: 2n }],
        },
      },
    ]);

    const result = await service.getMyClubs(7);

    expect(repositoryMock.findMyActiveClubs).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      items: [
        {
          clubId: 12,
          name: '테스트 동호회',
          thumbnailUrl: 'https://example.com/club.png',
          category: ClubCategory.OTHERS,
          introText: '테스트용 동호회입니다.',
          memberCount: 2,
          authority: ClubAuthority.HOST,
          joinedAt: joinedAt.toISOString(),
        },
      ],
    });
  });

  it('로그인하지 않았으면 내 동호회 목록을 조회할 수 없다', async () => {
    await expect(service.getMyClubs(0)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findMyActiveClubs).not.toHaveBeenCalled();
  });

  it('내가 찜한 동호회 목록을 반환한다', async () => {
    const likedAt = new Date('2026-05-03T15:40:00.000Z');
    repositoryMock.findMyLikedClubs.mockResolvedValue([
      {
        createdAt: likedAt,
        club: {
          id: 12n,
          name: '테스트 동호회',
          thumbnailUrl: 'https://example.com/club.png',
          category: ClubCategory.OTHERS,
          introText: '테스트용 동호회입니다.',
          clubUsers: [{ id: 1n }, { id: 2n }],
        },
      },
    ]);

    const result = await service.getMyLikedClubs(7);

    expect(repositoryMock.findMyLikedClubs).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      items: [
        {
          clubId: 12,
          name: '테스트 동호회',
          thumbnailUrl: 'https://example.com/club.png',
          category: ClubCategory.OTHERS,
          introText: '테스트용 동호회입니다.',
          memberCount: 2,
          likedAt: likedAt.toISOString(),
        },
      ],
    });
  });

  it('로그인하지 않았으면 찜한 동호회 목록을 조회할 수 없다', async () => {
    await expect(service.getMyLikedClubs(0)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findMyLikedClubs).not.toHaveBeenCalled();
  });

  it('내 프로필을 본 방문자 목록을 반환한다', async () => {
    const visitedAt = new Date('2026-05-04T15:40:00.000Z');
    repositoryMock.findMyLatestProfileVisitors.mockResolvedValue([
      {
        visitedAt,
        user: {
          id: 8n,
          nickname: '방문자',
          sex: Sex.F,
          age: 31,
          introText: '반갑습니다.',
          profileImageUrl: 'https://example.com/profile.png',
          address: {
            fullName: '서울특별시 강남구 역삼동',
            sigunguName: '서울특별시 강남구',
          },
        },
      },
    ]);

    const result = await service.getMyVisitors(7);

    expect(repositoryMock.findMyLatestProfileVisitors).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      items: [
        {
          userId: 8,
          nickname: '방문자',
          gender: Sex.F,
          age: 31,
          areaName: '서울특별시 강남구',
          introText: '반갑습니다.',
          profileImageUrl: 'https://example.com/profile.png',
          visitedAt: visitedAt.toISOString(),
        },
      ],
    });
  });

  it('내 프로필을 본 방문자가 없으면 빈 목록을 반환한다', async () => {
    repositoryMock.findMyLatestProfileVisitors.mockResolvedValue([]);

    const result = await service.getMyVisitors(7);

    expect(result).toEqual({ items: [] });
  });

  it('로그인하지 않았으면 내 프로필 방문자 목록을 조회할 수 없다', async () => {
    await expect(service.getMyVisitors(0)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findMyLatestProfileVisitors).not.toHaveBeenCalled();
  });

  it('프로필 조회 기록을 생성한다', async () => {
    repositoryMock.findActiveUserId.mockResolvedValue({ id: 8n });
    repositoryMock.createProfileVisitLog.mockResolvedValue({ id: 1n });

    const result = await service.markProfileVisit(7, 8);

    expect(result).toBeNull();
    expect(repositoryMock.findActiveUserId).toHaveBeenCalledWith(8);
    expect(repositoryMock.createProfileVisitLog).toHaveBeenCalledWith({
      visitedBy: 7,
      visitedTo: 8,
    });
  });

  it('로그인하지 않았으면 프로필 조회 기록을 생성할 수 없다', async () => {
    await expect(service.markProfileVisit(0, 8)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findActiveUserId).not.toHaveBeenCalled();
    expect(repositoryMock.createProfileVisitLog).not.toHaveBeenCalled();
  });

  it('대상 유저가 없으면 프로필 조회 기록을 생성할 수 없다', async () => {
    repositoryMock.findActiveUserId.mockResolvedValue(null);

    await expect(service.markProfileVisit(7, 8)).rejects.toMatchObject({
      internalCode: 'SOCIAL_TARGET_USER_NOT_FOUND',
    });
    expect(repositoryMock.createProfileVisitLog).not.toHaveBeenCalled();
  });

  it('자기 자신의 프로필 조회는 기록하지 않는다', async () => {
    repositoryMock.findActiveUserId.mockResolvedValue({ id: 7n });

    const result = await service.markProfileVisit(7, 7);

    expect(result).toBeNull();
    expect(repositoryMock.findActiveUserId).toHaveBeenCalledWith(7);
    expect(repositoryMock.createProfileVisitLog).not.toHaveBeenCalled();
  });
});
