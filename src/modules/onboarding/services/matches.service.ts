import { Injectable } from '@nestjs/common';
import { OnboardingAiService } from './onboarding-ai.service';

@Injectable()
export class MatchesService {
  constructor(private readonly onboardingAiService: OnboardingAiService) {}

  async getRecommendedMatches(
    userId: bigint,
    size = 20,
    cursorUserId?: bigint | null,
  ) {
    const result = await this.onboardingAiService.getRecommendedMatches(
      userId,
      size,
      cursorUserId,
    );

    return {
      nextCursor:
        result.nextCursor ??
        (result.items.length > 0
          ? this.generatorCursor(result.items[result.items.length - 1].userId)
          : null),
      items: result.items,
    };
  }

  private generatorCursor(userId: string | bigint | number): string {
    return Buffer.from(userId.toString()).toString('base64');
  }
}
