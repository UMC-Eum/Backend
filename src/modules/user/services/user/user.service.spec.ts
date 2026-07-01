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
    findPublicProfileById: jest.fn(),
    findMyActiveClubs: jest.fn(),
    findMyLikedClubs: jest.fn(),
    findMyLatestProfileVisitors: jest.fn(),
    findActiveUserId: jest.fn(),
    findActiveHeartSentByUser: jest.fn(),
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
        logId: 10n,
        visitedAt,
        visitedAtCursor: '2026-05-04 15:40:00.000000',
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

    expect(repositoryMock.findMyLatestProfileVisitors).toHaveBeenCalledWith({
      userId: 7,
      cursor: null,
      take: 21,
    });
    expect(result).toEqual({
      nextCursor: null,
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

    expect(result).toEqual({ nextCursor: null, items: [] });
  });

  it('로그인하지 않았으면 내 프로필 방문자 목록을 조회할 수 없다', async () => {
    await expect(service.getMyVisitors(0)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findMyLatestProfileVisitors).not.toHaveBeenCalled();
  });

  it('내 프로필 방문자 목록에 다음 페이지가 있으면 nextCursor를 반환한다', async () => {
    const firstVisitedAt = new Date('2026-05-04T15:40:00.000Z');
    const secondVisitedAt = new Date('2026-05-03T15:40:00.000Z');
    repositoryMock.findMyLatestProfileVisitors.mockResolvedValue([
      {
        logId: 10n,
        visitedAt: firstVisitedAt,
        visitedAtCursor: '2026-05-04 15:40:00.000000',
        user: {
          id: 8n,
          nickname: '첫번째 방문자',
          sex: Sex.F,
          age: 31,
          introText: '반갑습니다.',
          profileImageUrl: 'https://example.com/profile-1.png',
          address: null,
        },
      },
      {
        logId: 9n,
        visitedAt: secondVisitedAt,
        visitedAtCursor: '2026-05-03 15:40:00.000000',
        user: {
          id: 9n,
          nickname: '두번째 방문자',
          sex: Sex.M,
          age: 33,
          introText: '안녕하세요.',
          profileImageUrl: 'https://example.com/profile-2.png',
          address: null,
        },
      },
    ]);

    const result = await service.getMyVisitors(7, { size: '1' });

    expect(repositoryMock.findMyLatestProfileVisitors).toHaveBeenCalledWith({
      userId: 7,
      cursor: null,
      take: 2,
    });
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].userId).toBe(8);
  });

  it('내 프로필 방문자 목록 cursor를 해석해 다음 페이지를 조회한다', async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        visitedAt: '2026-05-04 15:40:00.123456',
        logId: '10',
      }),
      'utf8',
    )
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    repositoryMock.findMyLatestProfileVisitors.mockResolvedValue([]);

    await service.getMyVisitors(7, { cursor, size: '5' });

    expect(repositoryMock.findMyLatestProfileVisitors).toHaveBeenCalledWith({
      userId: 7,
      cursor: {
        visitedAt: '2026-05-04 15:40:00.123456',
        logId: '10',
      },
      take: 6,
    });
  });

  it('내 프로필 방문자 목록 cursor가 올바르지 않으면 조회할 수 없다', async () => {
    await expect(
      service.getMyVisitors(7, { cursor: 'invalid-cursor' }),
    ).rejects.toMatchObject({
      internalCode: 'VALIDATION_INVALID_FORMAT',
    });
    expect(repositoryMock.findMyLatestProfileVisitors).not.toHaveBeenCalled();
  });

  it('상대방 공개 프로필을 반환하고 방문 기록을 생성한다', async () => {
    repositoryMock.findPublicProfileById.mockResolvedValue({
      id: 8n,
      nickname: '상대방',
      age: 32,
      sex: Sex.F,
      introText: '반갑습니다.',
      profileImageUrl: 'https://example.com/profile.png',
      address: {
        fullName: '서울특별시 강남구 역삼동',
        sigunguName: '서울특별시 강남구',
      },
      interests: [
        {
          interest: {
            body: '등산',
          },
        },
      ],
      idealPersonalities: [
        {
          personality: {
            body: '차분한',
          },
        },
      ],
      clubs: [
        {
          id: 12n,
          name: '호스트 동호회',
          thumbnailUrl: 'https://example.com/host-club.png',
          category: ClubCategory.OTHERS,
          introText: '운영 중인 동호회입니다.',
        },
      ],
      clubUsers: [
        {
          authority: ClubAuthority.GENERAL,
          joinedAt: new Date('2026-05-01T00:00:00.000Z'),
          club: {
            id: 13n,
            name: '참여 동호회',
            thumbnailUrl: null,
            category: ClubCategory.CULTURE,
            introText: '참여 중인 동호회입니다.',
          },
        },
      ],
    });
    repositoryMock.findActiveHeartSentByUser.mockResolvedValue({ id: 101n });
    repositoryMock.createProfileVisitLog.mockResolvedValue({ id: 1n });

    const result = await service.getPublicProfile(7, 8);

    expect(repositoryMock.findPublicProfileById).toHaveBeenCalledWith(8);
    expect(repositoryMock.findActiveHeartSentByUser).toHaveBeenCalledWith({
      sentById: 7,
      sentToId: 8,
    });
    expect(repositoryMock.createProfileVisitLog).toHaveBeenCalledWith({
      visitedBy: 7,
      visitedTo: 8,
    });
    expect(result).toEqual({
      userId: 8,
      nickname: '상대방',
      age: 32,
      gender: Sex.F,
      area: {
        name: '서울특별시 강남구',
      },
      introText: '반갑습니다.',
      interests: ['등산'],
      idealPersonalities: ['차분한'],
      participatingClubs: [
        {
          clubId: 13,
          name: '참여 동호회',
          thumbnailUrl: null,
          category: ClubCategory.CULTURE,
          introText: '참여 중인 동호회입니다.',
        },
      ],
      hostingClubs: [
        {
          clubId: 12,
          name: '호스트 동호회',
          thumbnailUrl: 'https://example.com/host-club.png',
          category: ClubCategory.OTHERS,
          introText: '운영 중인 동호회입니다.',
        },
      ],
      hasSentHeart: true,
      profileImageUrl: 'https://example.com/profile.png',
    });
  });

  it('자기 자신의 공개 프로필 조회는 방문 기록을 생성하지 않는다', async () => {
    repositoryMock.findPublicProfileById.mockResolvedValue({
      id: 7n,
      nickname: '나',
      age: 30,
      sex: Sex.M,
      introText: '안녕하세요.',
      profileImageUrl: 'https://example.com/me.png',
      address: null,
      interests: [],
      idealPersonalities: [],
      clubs: [],
      clubUsers: [],
    });
    repositoryMock.findActiveHeartSentByUser.mockResolvedValue(null);

    const result = await service.getPublicProfile(7, 7);

    expect(result.userId).toBe(7);
    expect(result.hasSentHeart).toBe(false);
    expect(repositoryMock.createProfileVisitLog).not.toHaveBeenCalled();
  });

  it('대상 유저가 없으면 공개 프로필을 조회할 수 없다', async () => {
    repositoryMock.findPublicProfileById.mockResolvedValue(null);

    await expect(service.getPublicProfile(7, 8)).rejects.toMatchObject({
      internalCode: 'SOCIAL_TARGET_USER_NOT_FOUND',
    });
    expect(repositoryMock.createProfileVisitLog).not.toHaveBeenCalled();
  });

  it('로그인하지 않았으면 공개 프로필을 조회할 수 없다', async () => {
    await expect(service.getPublicProfile(0, 8)).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(repositoryMock.findPublicProfileById).not.toHaveBeenCalled();
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
