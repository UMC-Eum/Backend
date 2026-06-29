import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubCategory } from '@prisma/client';
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
});
