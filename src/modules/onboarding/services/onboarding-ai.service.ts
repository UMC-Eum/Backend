import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/common/errors/app.exception';
import { CreateProfileDto } from '../dtos/onboarding.dto';

type RecommendedMatchItem = {
  userId: string;
  [key: string]: unknown;
};

type FastApiMatchesResponse = {
  items: RecommendedMatchItem[];
  nextCursor?: string | null;
};

@Injectable()
export class OnboardingAiService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly profileAnalysisPath: string;
  private readonly matchRecommendPath: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('FASTAPI_BASE_URL');
    this.timeoutMs = this.configService.get<number>(
      'FASTAPI_TIMEOUT_MS',
      10000,
    );
    this.profileAnalysisPath = this.configService.get<string>(
      'FASTAPI_PROFILE_ANALYSIS_PATH',
      '/onboarding/profile/analyze',
    );
    this.matchRecommendPath = this.configService.get<string>(
      'FASTAPI_MATCH_RECOMMEND_PATH',
      '/onboarding/matches/recommend',
    );
  }

  async analyzeProfile(
    userId: number,
    dto: CreateProfileDto,
  ): Promise<{ selectedKeywords: string[]; vibeVector: number[] }> {
    const result = await this.callFastApi<{
      resultType?: unknown;
      success?: {
        data?: {
          matchedKeywords?: unknown;
          vibeVector?: unknown;
          vibe_vector?: unknown;
          selectedKeywords?: unknown;
          selected_keywords?: unknown;
        };
      };
      data?: {
        matchedKeywords?: unknown;
        vibeVector?: unknown;
        vibe_vector?: unknown;
        selectedKeywords?: unknown;
        selected_keywords?: unknown;
      };
      selectedKeywords?: unknown;
      selected_keywords?: unknown;
      vibeVector?: unknown;
      vibe_vector?: unknown;
    }>(this.profileAnalysisPath, {
      transcript: dto.introText,
      local_audio_path: dto.introAudioUrl,
      analysis_type: 'profile',
      user_id: userId,
    });

    const payloadData: Record<string, unknown> =
      result.success?.data &&
      typeof result.success.data === 'object' &&
      result.success.data !== null
        ? (result.success.data as Record<string, unknown>)
        : result.data && typeof result.data === 'object' && result.data !== null
          ? (result.data as Record<string, unknown>)
          : (result as Record<string, unknown>);

    const selectedKeywordsFromList = this.extractKeywordsFromMatchedKeywords(
      payloadData.matchedKeywords,
    );
    const selectedKeywords = this.pickStringArray(
      payloadData.selectedKeywords,
      payloadData.selected_keywords,
      selectedKeywordsFromList,
    );

    const vibeVector = this.pickNumberArray(
      payloadData.vibeVector,
      payloadData.vibe_vector,
    );

    return {
      selectedKeywords,
      vibeVector,
    };
  }

  async getRecommendedMatches(
    userId: bigint,
    size: number,
    cursorUserId?: bigint | null,
  ): Promise<FastApiMatchesResponse> {
    const result = await this.callFastApi<{
      items?: unknown;
      nextCursor?: unknown;
    }>(this.matchRecommendPath, {
      userId: userId.toString(),
      size,
      cursorUserId: cursorUserId ? cursorUserId.toString() : null,
    });

    if (!Array.isArray(result.items)) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: 'Invalid items from FastAPI',
      });
    }

    const items = result.items.filter((item): item is RecommendedMatchItem => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const candidate = item as Record<string, unknown>;
      return typeof candidate.userId === 'string';
    });

    if (items.length !== result.items.length) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: 'Invalid item format from FastAPI',
      });
    }

    if (
      result.nextCursor !== undefined &&
      result.nextCursor !== null &&
      typeof result.nextCursor !== 'string'
    ) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: 'Invalid nextCursor from FastAPI',
      });
    }

    return {
      items,
      nextCursor: result.nextCursor,
    };
  }

  private buildUrl(path: string): string {
    const normalizedBaseUrl = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  private async callFastApi<T>(path: string, payload: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.buildUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: { path, status: response.status, body },
      });
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: {
          path,
          message: 'Invalid JSON from FastAPI',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private pickStringArray(...candidates: unknown[]): string[] {
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const extracted = candidate
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
    return [];
  }

  private pickNumberArray(...candidates: unknown[]): number[] {
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const extracted = candidate.filter(
          (item): item is number =>
            typeof item === 'number' && Number.isFinite(item),
        );
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
    return [];
  }

  private extractKeywordsFromMatchedKeywords(
    matchedKeywords: unknown,
  ): string[] {
    if (!Array.isArray(matchedKeywords)) {
      return [];
    }

    return matchedKeywords
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const record = item as Record<string, unknown>;
        return typeof record.keyword === 'string' ? record.keyword : null;
      })
      .filter((keyword): keyword is string => keyword !== null)
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
  }
}
