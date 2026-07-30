import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { OnboardingAiService } from './onboarding-ai.service';
import { ClubRepository } from '../../club/repositories/club.repository';
import { PrismaService } from '../../../infra/prisma/prisma.service';

describe('MatchesService', () => {
  let service: MatchesService;
  const getRecommendedMatches = jest.fn();
  const getRecommendedClubs = jest.fn();
  const findActiveMemberCountsByClubIds = jest.fn();
  const findVisibleClubIdsByClubIds = jest.fn();
  const blockFindMany = jest.fn();

  beforeEach(async () => {
    getRecommendedMatches.mockReset();
    getRecommendedClubs.mockReset();
    findActiveMemberCountsByClubIds.mockReset();
    findVisibleClubIdsByClubIds.mockReset();
    blockFindMany.mockReset();
    blockFindMany.mockResolvedValue([]);
    findVisibleClubIdsByClubIds.mockImplementation((clubIds: bigint[]) => {
      return Promise.resolve(
        new Set(clubIds.map((clubId) => clubId.toString())),
      );
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: OnboardingAiService,
          useValue: {
            getRecommendedMatches,
            getRecommendedClubs,
          },
        },
        {
          provide: ClubRepository,
          useValue: {
            findActiveMemberCountsByClubIds,
            findVisibleClubIdsByClubIds,
          },
        },
        {
          provide: PrismaService,
          useValue: {
            block: {
              findMany: blockFindMany,
            },
          },
        },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  it('추천 클럽 목록에 활성 멤버 수를 추가한다', async () => {
    getRecommendedClubs.mockResolvedValue({
      resultType: 'SUCCESS',
      success: {
        data: {
          items: [
            {
              clubId: '12',
              name: '등산 러버즈',
              capacity: 30,
            },
            {
              clubId: '13',
              name: '러닝 클럽',
              capacity: 20,
            },
          ],
          page: {
            size: 20,
            hasNext: false,
            nextCursor: null,
          },
        },
      },
    });
    findActiveMemberCountsByClubIds.mockResolvedValue(
      new Map([
        ['12', 18],
        ['13', 9],
      ]),
    );

    await expect(
      service.getRecommendedClubs(7n, undefined, '20', '1168000000'),
    ).resolves.toEqual({
      items: [
        {
          clubId: '12',
          name: '등산 러버즈',
          capacity: 30,
          memberCount: 18,
        },
        {
          clubId: '13',
          name: '러닝 클럽',
          capacity: 20,
          memberCount: 9,
        },
      ],
      page: {
        size: 20,
        hasNext: false,
        nextCursor: null,
      },
    });
    expect(findActiveMemberCountsByClubIds).toHaveBeenCalledWith([12n, 13n]);
    expect(findVisibleClubIdsByClubIds).toHaveBeenCalledWith([12n, 13n], 7n);
  });

  it('추천 매칭 후보에서 차단 관계 사용자를 제거한다', async () => {
    getRecommendedMatches.mockResolvedValue({
      success: {
        data: {
          items: [
            { userId: '8', nickname: 'visible' },
            { userId: '9', nickname: 'blocked' },
          ],
          page: { size: 20, hasNext: false, nextCursor: null },
        },
      },
    });
    blockFindMany.mockResolvedValue([
      {
        blockedById: 7n,
        blockedId: 9n,
      },
    ]);

    await expect(service.getRecommendedMatches(7n)).resolves.toEqual({
      items: [{ userId: '8', nickname: 'visible' }],
      page: { size: 20, hasNext: false, nextCursor: null },
    });
    expect(blockFindMany).toHaveBeenCalledWith({
      where: {
        status: 'BLOCKED',
        deletedAt: null,
        OR: [{ blockedById: 7n }, { blockedId: 7n }],
      },
      select: {
        blockedById: true,
        blockedId: true,
      },
    });
  });

  it('추천 클럽에서 차단 관계 호스트의 클럽을 제거한다', async () => {
    getRecommendedClubs.mockResolvedValue({
      success: {
        data: {
          items: [
            { clubId: '12', name: 'visible' },
            { clubId: '13', name: 'blocked-host-club' },
          ],
          page: { size: 20, hasNext: false, nextCursor: null },
        },
      },
    });
    findVisibleClubIdsByClubIds.mockResolvedValue(new Set(['12']));
    findActiveMemberCountsByClubIds.mockResolvedValue(new Map([['12', 18]]));

    await expect(service.getRecommendedClubs(7n)).resolves.toEqual({
      items: [{ clubId: '12', name: 'visible', memberCount: 18 }],
      page: { size: 20, hasNext: false, nextCursor: null },
    });
    expect(findActiveMemberCountsByClubIds).toHaveBeenCalledWith([12n]);
  });
});
