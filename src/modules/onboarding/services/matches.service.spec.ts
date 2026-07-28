import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { OnboardingAiService } from './onboarding-ai.service';
import { ClubRepository } from '../../club/repositories/club.repository';

describe('MatchesService', () => {
  let service: MatchesService;
  const getRecommendedMatches = jest.fn();
  const getRecommendedClubs = jest.fn();
  const findActiveMemberCountsByClubIds = jest.fn();

  beforeEach(async () => {
    getRecommendedMatches.mockReset();
    getRecommendedClubs.mockReset();
    findActiveMemberCountsByClubIds.mockReset();

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
  });
});
