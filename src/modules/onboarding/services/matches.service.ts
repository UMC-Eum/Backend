import { Injectable } from '@nestjs/common';
import { OnboardingAiService } from './onboarding-ai.service';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class MatchesService {
  constructor(private readonly onboardingAiService: OnboardingAiService) {}

  async getRecommendedMatches(userId: bigint, cursor?: string, size?: string) {
    const result = await this.onboardingAiService.getRecommendedMatches(
      userId,
      cursor,
      size,
    );
    return this.extractDataPayload(result);
  }

  async getRecommendedClubs(
    userId: bigint,
    cursor?: string,
    size?: string,
    areaCode?: string,
  ) {
    const result = await this.onboardingAiService.getRecommendedClubs(
      userId,
      cursor,
      size,
      areaCode,
    );
    return this.extractDataPayload(result);
  }

  private extractDataPayload(raw: unknown): Record<string, unknown> {
    if (typeof raw !== 'object' || raw === null) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: 'Invalid response from FastAPI',
      });
    }

    const record = raw as Record<string, unknown>;
    const success = record.success;
    if (
      typeof success === 'object' &&
      success !== null &&
      'data' in success &&
      typeof (success as { data?: unknown }).data === 'object' &&
      (success as { data?: unknown }).data !== null
    ) {
      return (success as { data: Record<string, unknown> }).data;
    }

    if (typeof record.data === 'object' && record.data !== null) {
      return record.data as Record<string, unknown>;
    }

    return record;
  }
}
