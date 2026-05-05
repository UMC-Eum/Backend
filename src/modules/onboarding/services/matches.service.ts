import { Injectable } from '@nestjs/common';
import { OnboardingAiService } from './onboarding-ai.service';

@Injectable()
export class MatchesService {
  constructor(private readonly onboardingAiService: OnboardingAiService) {}

  async getRecommendedMatches(userId: bigint) {
    const result = await this.onboardingAiService.getRecommendedMatches(userId);

    return {
      nextCursor: result.nextCursor ?? null,
      items: result.items,
    };
  }
}
