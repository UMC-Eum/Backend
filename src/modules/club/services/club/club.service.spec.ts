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
import { UserRepository } from '../../../user/repositories/user.repository';
import { OnboardingAiService } from '../../../onboarding/services/onboarding-ai.service';

describe('ClubService', () => {
  let service: ClubService;
  const findManyForList = jest.fn();
  const findTopHosts = jest.fn();
  const findDetailById = jest.fn();
  const findClubUserState = jest.fn();
  const hasClubLike = jest.fn();
  const createClubLike = jest.fn();
  const deleteClubLike = jest.fn();
  const createClubWithHost = jest.fn();
  const applyClubAnalysis = jest.fn();
  const deleteCreatedClub = jest.fn();
  const findById = jest.fn();
  const updateClub = jest.fn();
  const softDeleteClub = jest.fn();
  const findProfileById = jest.fn();
  const analyzeClubVibe = jest.fn();

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
    createClubWithHost.mockReset();
    applyClubAnalysis.mockReset();
    deleteCreatedClub.mockReset();
    findById.mockReset();
    updateClub.mockReset();
    softDeleteClub.mockReset();
    findProfileById.mockReset();
    analyzeClubVibe.mockReset();

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
            createClubWithHost,
            applyClubAnalysis,
            deleteCreatedClub,
            findById,
            updateClub,
            softDeleteClub,
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findProfileById,
          },
        },
        {
          provide: OnboardingAiService,
          useValue: {
            analyzeClubVibe,
          },
        },
      ],
    }).compile();

    service = module.get<ClubService>(ClubService);
  });

  it('클럽 목록을 DTO로 변환하고 다음 커서를 반환한다', async () => {
    findProfileById.mockResolvedValue({ address: { code: '1100000000' } });
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

    const result = await service.listClubs(7, {
      sort: ClubListSort.POPULAR,
      limit: 1,
    });

    expect(findProfileById).toHaveBeenCalledWith(7);
    expect(findManyForList).toHaveBeenCalledWith({
      keyword: undefined,
      category: undefined,
      code: '1100000000',
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

  it('클럽 생성 후 분석 결과를 저장하고 생성 응답을 반환한다', async () => {
    findProfileById.mockResolvedValue({
      id: 7n,
      nickname: '보이스마스터',
      profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      address: { code: '1100000000' },
    });
    createClubWithHost.mockResolvedValue({
      id: 12n,
      code: '1100000000',
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      capacity: 30,
      createdAt: new Date('2026-05-01T16:35:00.000Z'),
      user: {
        id: 7n,
        nickname: '보이스마스터',
        profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      },
      _count: { clubUsers: 1 },
    });
    analyzeClubVibe.mockResolvedValue({
      selectedKeywords: ['목소리', '친목'],
      vibeVector: [0.1, 0.2],
    });
    applyClubAnalysis.mockResolvedValue(undefined);

    const dto = {
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      introText: '목소리로 친해져요',
      introVoice: 'https://cdn.example.com/voice/12.mp3',
      capacity: 30,
      keywordIds: [1, 4, 7],
    };

    await expect(service.createClub(7, dto)).resolves.toEqual({
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
    });
    expect(createClubWithHost).toHaveBeenCalledWith({
      hostId: 7n,
      name: dto.name,
      category: dto.category,
      introText: dto.introText,
      introVoice: dto.introVoice,
      capacity: dto.capacity,
      addressCode: '1100000000',
      keywordIds: dto.keywordIds,
    });
    expect(analyzeClubVibe).toHaveBeenCalledWith({
      clubId: 12,
      transcript: dto.introText,
      analysis_type: 'profile',
    });
    expect(applyClubAnalysis).toHaveBeenCalledWith(
      12n,
      ['목소리', '친목'],
      [0.1, 0.2],
    );
    expect(deleteCreatedClub).not.toHaveBeenCalled();
  });

  it('클럽 생성 후 분석 실패 시 생성된 클럽을 제거한다', async () => {
    findProfileById.mockResolvedValue({
      id: 7n,
      nickname: '보이스마스터',
      profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      address: { code: '1100000000' },
    });
    createClubWithHost.mockResolvedValue({
      id: 12n,
      code: '1100000000',
      name: '보이스 러버즈',
      category: ClubCategory.OTHERS,
      capacity: 30,
      createdAt: new Date('2026-05-01T16:35:00.000Z'),
      user: {
        id: 7n,
        nickname: '보이스마스터',
        profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
      },
      _count: { clubUsers: 1 },
    });
    const error = new AppException('SERVER_TEMPORARY_ERROR');
    analyzeClubVibe.mockRejectedValue(error);
    deleteCreatedClub.mockResolvedValue(undefined);

    await expect(
      service.createClub(7, {
        name: '보이스 러버즈',
        category: ClubCategory.OTHERS,
        introText: '목소리로 친해져요',
        introVoice: 'https://cdn.example.com/voice/12.mp3',
        capacity: 30,
        keywordIds: [1, 4, 7],
      }),
    ).rejects.toBe(error);
    expect(deleteCreatedClub).toHaveBeenCalledWith(12n, 7n);
  });

  it('클럽 목록 조회 시 유저가 없으면 로그인 필요 에러를 던진다', async () => {
    findProfileById.mockResolvedValue(null);

    await expect(
      service.listClubs(7, {
        sort: ClubListSort.POPULAR,
        limit: 1,
      }),
    ).rejects.toThrow(AppException);
    expect(findManyForList).not.toHaveBeenCalled();
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

  it('호스트가 name만 수정하면 업데이트 결과를 반환한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈 시즌3',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: 'https://cdn.example.com/voice/12.mp3',
      introText: '등산으로 친해져요',
      capacity: 30,
      updatedAt: new Date('2026-05-01T20:25:00.000Z'),
      clubKeywords: [{ personality: { body: '등산' } }],
    });

    await expect(
      service.updateClub(7, 12, { name: '등산 러버즈 시즌3' }),
    ).resolves.toEqual({
      clubId: '12',
      name: '등산 러버즈 시즌3',
      category: ClubCategory.OUTDOOR,
      introVoice: 'https://cdn.example.com/voice/12.mp3',
      introText: '등산으로 친해져요',
      capacity: 30,
      keywords: ['등산'],
      updatedAt: '2026-05-01T20:25:00.000Z',
    });
    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: { name: '등산 러버즈 시즌3' },
      keywordIds: undefined,
    });
  });

  it('호스트가 introText와 capacity만 수정하면 해당 필드만 전달한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: null,
      introText: '더 즐겁게 모여요',
      capacity: 60,
      updatedAt: null,
      clubKeywords: [],
    });

    await service.updateClub(7, 12, {
      introText: '더 즐겁게 모여요',
      capacity: 60,
    });

    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: {
        introText: '더 즐겁게 모여요',
        capacity: 60,
      },
      keywordIds: undefined,
    });
  });

  it('introVoice null은 음성 소개 제거로 전달한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: null,
      introText: '등산으로 친해져요',
      capacity: 30,
      updatedAt: null,
      clubKeywords: [],
    });

    await service.updateClub(7, 12, { introVoice: null });

    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: { introVoiceUrl: null },
      keywordIds: undefined,
    });
  });

  it('keywordIds 배열은 키워드 관계 교체 대상으로 전달한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: null,
      introText: '등산으로 친해져요',
      capacity: 30,
      updatedAt: null,
      clubKeywords: [{ personality: { body: '등산' } }],
    });

    await service.updateClub(7, 12, { keywordIds: [1, 4, 7] });

    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: {},
      keywordIds: [1n, 4n, 7n],
    });
  });

  it('keywordIds 빈 배열은 키워드 전체 제거로 전달한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: null,
      introText: '등산으로 친해져요',
      capacity: 30,
      updatedAt: null,
      clubKeywords: [],
    });

    await service.updateClub(7, 12, { keywordIds: [] });

    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: {},
      keywordIds: [],
    });
  });

  it('빈 body는 변경 없이 현재 클럽 정보를 반환한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    updateClub.mockResolvedValue({
      id: 12n,
      name: '등산 러버즈',
      category: ClubCategory.OUTDOOR,
      introVoiceUrl: null,
      introText: '등산으로 친해져요',
      capacity: 30,
      updatedAt: null,
      clubKeywords: [],
    });

    await service.updateClub(7, 12, {});

    expect(updateClub).toHaveBeenCalledWith({
      clubId: 12n,
      data: {},
      keywordIds: undefined,
    });
  });

  it('수정할 클럽이 없으면 CLUB_NOT_FOUND', async () => {
    findById.mockResolvedValue(null);

    await expect(
      service.updateClub(7, 12, { name: '등산 러버즈 시즌3' }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
    expect(updateClub).not.toHaveBeenCalled();
  });

  it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 9n,
      deletedAt: null,
    });

    await expect(
      service.updateClub(7, 12, { name: '등산 러버즈 시즌3' }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    } satisfies Partial<AppException>);
    expect(updateClub).not.toHaveBeenCalled();
  });

  it('호스트가 클럽을 삭제하면 deletedAt을 반환한다', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: null,
    });
    const deletedAt = new Date('2026-05-01T18:50:00.000Z');
    softDeleteClub.mockResolvedValue({
      id: 12n,
      deletedAt,
    });

    await expect(service.deleteClub(7, 12)).resolves.toEqual({
      clubId: '12',
      deletedAt: '2026-05-01T18:50:00.000Z',
    });
    expect(softDeleteClub).toHaveBeenCalledWith(12n, expect.any(Date));
  });

  it('삭제할 클럽이 없으면 CLUB_NOT_FOUND', async () => {
    findById.mockResolvedValue(null);

    await expect(service.deleteClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
    expect(softDeleteClub).not.toHaveBeenCalled();
  });

  it('이미 삭제된 클럽이면 CLUB_NOT_FOUND', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 7n,
      deletedAt: new Date('2026-05-01T18:50:00.000Z'),
    });

    await expect(service.deleteClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    } satisfies Partial<AppException>);
    expect(softDeleteClub).not.toHaveBeenCalled();
  });

  it('호스트가 아니면 클럽 삭제 시 CLUB_FORBIDDEN_NOT_HOST', async () => {
    findById.mockResolvedValue({
      id: 12n,
      hostId: 9n,
      deletedAt: null,
    });

    await expect(service.deleteClub(7, 12)).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    } satisfies Partial<AppException>);
    expect(softDeleteClub).not.toHaveBeenCalled();
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
