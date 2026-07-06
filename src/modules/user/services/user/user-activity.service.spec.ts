import { Test, TestingModule } from '@nestjs/testing';
import { Sex } from '@prisma/client';
import { PRESENCE_STORE } from '../../../../infra/websocket/presence/presence.token';
import { UserRepository } from '../../repositories/user.repository';
import {
  LAST_ACTIVE_PERSIST_INTERVAL_MS,
  UserActivityService,
} from './user-activity.service';

describe('UserActivityService', () => {
  let service: UserActivityService;
  const repositoryMock = {
    updateLastActiveAt: jest.fn(),
    findActiveUserAreaById: jest.fn(),
    findAddressAreaByCode: jest.fn(),
    findActiveUsersByIdsInArea: jest.fn(),
  };
  const presenceStoreMock = {
    getActiveUsers: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-07T06:00:00.000Z'));
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
    Object.values(presenceStoreMock).forEach((mock) => mock.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityService,
        {
          provide: UserRepository,
          useValue: repositoryMock,
        },
        {
          provide: PRESENCE_STORE,
          useValue: presenceStoreMock,
        },
      ],
    }).compile();

    service = module.get<UserActivityService>(UserActivityService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throttles lastActiveAt persistence', async () => {
    await service.recordActivity(7);
    await service.recordActivity(7);

    expect(repositoryMock.updateLastActiveAt).toHaveBeenCalledTimes(1);

    jest.setSystemTime(
      new Date(Date.now() + LAST_ACTIVE_PERSIST_INTERVAL_MS + 1),
    );
    await service.recordActivity(7);

    expect(repositoryMock.updateLastActiveAt).toHaveBeenCalledTimes(2);
  });

  it('returns active users in viewer area and excludes the viewer', async () => {
    repositoryMock.findActiveUserAreaById.mockResolvedValue({
      address: { sidoCode: '11', sigunguCode: '680' },
    });
    presenceStoreMock.getActiveUsers.mockReturnValue([
      {
        userId: 7,
        lastActiveAt: new Date('2026-07-07T06:01:00.000Z'),
      },
      {
        userId: 8,
        lastActiveAt: new Date('2026-07-07T06:00:30.000Z'),
      },
    ]);
    repositoryMock.findActiveUsersByIdsInArea.mockResolvedValue([
      {
        id: BigInt(8),
        nickname: '상대',
        sex: Sex.F,
        age: 51,
        introText: '안녕하세요.',
        profileImageUrl: 'https://example.com/profile.png',
        address: {
          fullName: '서울특별시 강남구',
          sigunguName: '서울특별시 강남구',
        },
      },
    ]);

    const result = await service.getActiveUsers(7);

    expect(repositoryMock.findActiveUsersByIdsInArea).toHaveBeenCalledWith({
      userIds: [8],
      sidoCode: '11',
      sigunguCode: '680',
    });
    expect(result).toEqual({
      items: [
        {
          userId: 8,
          nickname: '상대',
          gender: Sex.F,
          age: 51,
          areaName: '서울특별시 강남구',
          introText: '안녕하세요.',
          profileImageUrl: 'https://example.com/profile.png',
          lastActiveAt: '2026-07-07T06:00:30.000Z',
        },
      ],
      page: {
        size: 20,
        hasNext: false,
        nextCursor: null,
      },
    });
  });

  it('uses requested areaCode when provided', async () => {
    repositoryMock.findActiveUserAreaById.mockResolvedValue({
      address: { sidoCode: '11', sigunguCode: '680' },
    });
    repositoryMock.findAddressAreaByCode.mockResolvedValue({
      sidoCode: '26',
      sigunguCode: '350',
    });
    presenceStoreMock.getActiveUsers.mockReturnValue([]);
    repositoryMock.findActiveUsersByIdsInArea.mockResolvedValue([]);

    await service.getActiveUsers(7, { areaCode: '2635000000' });

    expect(repositoryMock.findAddressAreaByCode).toHaveBeenCalledWith(
      '2635000000',
    );
    expect(repositoryMock.findActiveUsersByIdsInArea).toHaveBeenCalledWith({
      userIds: [],
      sidoCode: '26',
      sigunguCode: '350',
    });
  });

  it('rejects invalid areaCode', async () => {
    repositoryMock.findActiveUserAreaById.mockResolvedValue({
      address: { sidoCode: '11', sigunguCode: '680' },
    });
    repositoryMock.findAddressAreaByCode.mockResolvedValue(null);

    await expect(
      service.getActiveUsers(7, { areaCode: 'invalid' }),
    ).rejects.toMatchObject({
      internalCode: 'VALIDATION_INVALID_FORMAT',
    });
  });
});
