import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/errors/app.exception';
import { CreateProfileRequestDto } from '../dtos/onboarding.dto';

type FastApiMatchesResponse = unknown;

type ProfileMatchedKeyword = {
  category: string;
  id: number;
  keyword: string;
  score: number;
};

type ProfileAnalysisResult = {
  matchedKeywords: ProfileMatchedKeyword[];
  selectedKeywords: string[];
  summary: string;
  transcript: string;
  vibeVector: number[];
};

@Injectable()
export class OnboardingAiService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly profileAnalysisPath: string;
  private readonly clubVibeAnalysisPath: string;
  private readonly matchRecommendPath: string;
  private readonly clubRecommendPath: string;

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
    this.clubVibeAnalysisPath = this.configService.get<string>(
      'FASTAPI_CLUB_VIBE_ANALYSIS_PATH',
      '/api/v1/onboarding/club-vibe/analyze',
    );
    this.matchRecommendPath = this.configService.get<string>(
      'FASTAPI_MATCH_RECOMMEND_PATH',
      '/onboarding/matches/recommend',
    );
    this.clubRecommendPath = this.configService.get<string>(
      'FASTAPI_CLUB_RECOMMEND_PATH',
      '/api/v1/recommendation/clubs',
    );
  }

  async analyzeProfile(
    userId: number,
    dto: CreateProfileRequestDto,
  ): Promise<ProfileAnalysisResult> {
    const result = await this.callFastApi<{
      resultType?: unknown;
      success?: {
        data?: {
          matchedKeywords?: unknown;
          matched_keywords?: unknown;
          vibeVector?: unknown;
          vibe_vector?: unknown;
          selectedKeywords?: unknown;
          selected_keywords?: unknown;
          summary?: unknown;
          transcript?: unknown;
        };
      };
      data?: {
        matchedKeywords?: unknown;
        matched_keywords?: unknown;
        vibeVector?: unknown;
        vibe_vector?: unknown;
        selectedKeywords?: unknown;
        selected_keywords?: unknown;
        summary?: unknown;
        transcript?: unknown;
      };
      selectedKeywords?: unknown;
      selected_keywords?: unknown;
      summary?: unknown;
      transcript?: unknown;
      vibeVector?: unknown;
      vibe_vector?: unknown;
    }>(this.profileAnalysisPath, {
      birthdate: dto.birthDate,
      introAudioUrl: dto.introAudioUrl,
      sex: dto.gender,
    });

    this.assertFastApiSuccess(result, this.profileAnalysisPath);

    const payloadData = this.extractPayloadData(result);

    const matchedKeywords = this.extractProfileMatchedKeywordObjects(
      payloadData.matchedKeywords,
      payloadData.matched_keywords,
    );
    const selectedKeywordsFromList =
      this.extractKeywordsFromMatchedKeywords(matchedKeywords);
    const selectedKeywords = this.pickStringArray(
      payloadData.selectedKeywords,
      payloadData.selected_keywords,
      selectedKeywordsFromList,
    );

    const vibeVector = this.pickNumberArray(
      payloadData.vibeVector,
      payloadData.vibe_vector,
    );
    this.assertNonEmptyArray(
      vibeVector,
      this.profileAnalysisPath,
      'vibeVector',
    );

    return {
      matchedKeywords,
      selectedKeywords,
      summary:
        typeof payloadData.summary === 'string' ? payloadData.summary : '',
      transcript:
        typeof payloadData.transcript === 'string'
          ? payloadData.transcript
          : '',
      vibeVector,
    };
  }

  async analyzeClubVibe(dto: {
    clubId: number;
    transcript: string;
    analysis_type: string;
  }): Promise<{
    clubId: number;
    transcript: string;
    summary: string;
    vectorId: string;
    matchedKeywords: { keyword: string }[];
    selectedKeywords: string[];
    vibeVector: number[];
  }> {
    const result = await this.callFastApi<{
      resultType?: unknown;
      success?: {
        data?: {
          clubId?: unknown;
          club_id?: unknown;
          transcript?: unknown;
          summary?: unknown;
          vectorId?: unknown;
          vector_id?: unknown;
          matchedKeywords?: unknown;
          matched_keywords?: unknown;
          vibeVector?: unknown;
          vibe_vector?: unknown;
        };
      };
      data?: {
        clubId?: unknown;
        club_id?: unknown;
        transcript?: unknown;
        summary?: unknown;
        vectorId?: unknown;
        vector_id?: unknown;
        matchedKeywords?: unknown;
        matched_keywords?: unknown;
        vibeVector?: unknown;
        vibe_vector?: unknown;
      };
      clubId?: unknown;
      club_id?: unknown;
      transcript?: unknown;
      summary?: unknown;
      vectorId?: unknown;
      vector_id?: unknown;
      matchedKeywords?: unknown;
      matched_keywords?: unknown;
      vibeVector?: unknown;
      vibe_vector?: unknown;
    }>(this.clubVibeAnalysisPath, {
      transcript: dto.transcript,
      analysis_type: dto.analysis_type,
    });

    this.assertFastApiSuccess(result, this.clubVibeAnalysisPath);

    const payloadData = this.extractPayloadData(result);
    const matchedKeywords = this.extractMatchedKeywordObjects(
      payloadData.matchedKeywords,
      payloadData.matched_keywords,
    );
    const selectedKeywords = matchedKeywords.map((item) => item.keyword);
    const vibeVector = this.pickNumberArray(
      payloadData.vibeVector,
      payloadData.vibe_vector,
    );
    this.assertNonEmptyArray(
      vibeVector,
      this.clubVibeAnalysisPath,
      'vibeVector',
    );

    return {
      clubId:
        this.pickNumber(payloadData.clubId, payloadData.club_id) ?? dto.clubId,
      transcript:
        typeof payloadData.transcript === 'string'
          ? payloadData.transcript
          : dto.transcript,
      summary:
        typeof payloadData.summary === 'string' ? payloadData.summary : '',
      vectorId:
        typeof payloadData.vectorId === 'string'
          ? payloadData.vectorId
          : typeof payloadData.vector_id === 'string'
            ? payloadData.vector_id
            : dto.clubId.toString(),
      matchedKeywords,
      selectedKeywords,
      vibeVector,
    };
  }

  async getRecommendedMatches(
    userId: bigint,
    cursor?: string,
    size?: string,
  ): Promise<FastApiMatchesResponse> {
    const query: Record<string, string> = {
      userId: userId.toString(),
    };

    if (cursor !== undefined) {
      query.cursor = cursor;
    }

    if (size !== undefined) {
      query.size = size;
    }

    return this.callFastApiGet<FastApiMatchesResponse>(
      this.matchRecommendPath,
      query,
    );
  }

  async getRecommendedClubs(
    userId: bigint,
    cursor?: string,
    size?: string,
  ): Promise<FastApiMatchesResponse> {
    const query: Record<string, string> = {
      userId: userId.toString(),
    };

    if (cursor !== undefined) {
      query.cursor = cursor;
    }

    if (size !== undefined) {
      query.size = size;
    }

    return this.callFastApiGet<FastApiMatchesResponse>(
      this.clubRecommendPath,
      query,
    );
  }

  private buildUrl(path: string): string {
    const normalizedBaseUrl = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  private async callFastApi<T>(path: string, payload: unknown): Promise<T> {
    let response: Response;
    const url = this.buildUrl(path);
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', {
        details: this.buildFetchErrorDetails('POST', url, error),
      });
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

  private async callFastApiGet<T>(
    path: string,
    query: Record<string, string>,
  ): Promise<T> {
    const url = new URL(this.buildUrl(path));
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', {
        details: this.buildFetchErrorDetails('GET', url.toString(), error),
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: { path: url.toString(), status: response.status, body },
      });
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: {
          path: url.toString(),
          message: 'Invalid JSON from FastAPI',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private buildFetchErrorDetails(
    method: 'GET' | 'POST',
    url: string,
    error: unknown,
  ): Record<string, unknown> {
    return {
      method,
      url,
      timeoutMs: this.timeoutMs,
      error: this.serializeError(error),
    };
  }

  private serializeError(error: unknown, depth = 0): Record<string, unknown> {
    if (depth > 2) {
      return { message: String(error) };
    }

    if (error instanceof Error) {
      const cause = this.readProperty(error, 'cause');
      return {
        name: error.name,
        message: error.message,
        code: this.readProperty(error, 'code'),
        errno: this.readProperty(error, 'errno'),
        syscall: this.readProperty(error, 'syscall'),
        address: this.readProperty(error, 'address'),
        port: this.readProperty(error, 'port'),
        cause:
          cause === undefined
            ? undefined
            : this.serializeError(cause, depth + 1),
      };
    }

    if (typeof error === 'object' && error !== null) {
      return Object.fromEntries(
        Object.getOwnPropertyNames(error).map((key) => [
          key,
          this.readProperty(error, key),
        ]),
      );
    }

    return { message: String(error) };
  }

  private readProperty(target: unknown, key: string): unknown {
    if (typeof target !== 'object' || target === null) {
      return undefined;
    }

    return (target as Record<string, unknown>)[key];
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

  private pickNumber(...candidates: unknown[]): number | null {
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private extractPayloadData(result: {
    success?: { data?: unknown };
    data?: unknown;
  }): Record<string, unknown> {
    return result.success?.data &&
      typeof result.success.data === 'object' &&
      result.success.data !== null
      ? (result.success.data as Record<string, unknown>)
      : result.data && typeof result.data === 'object' && result.data !== null
        ? (result.data as Record<string, unknown>)
        : (result as Record<string, unknown>);
  }

  private assertFastApiSuccess(result: unknown, path: string): void {
    if (typeof result !== 'object' || result === null) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: {
          path,
          message: 'Invalid response shape from FastAPI',
          result,
        },
      });
    }

    const record = result as Record<string, unknown>;
    if (record.resultType === 'FAIL' || record.success === null) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: {
          path,
          message: 'FastAPI returned failure response',
          result,
        },
      });
    }
  }

  private assertNonEmptyArray<T>(
    value: T[],
    path: string,
    field: string,
  ): void {
    if (value.length > 0) {
      return;
    }

    throw new AppException('SERVER_TEMPORARY_ERROR', {
      details: {
        path,
        field,
        message: 'Required analysis field is missing or empty',
      },
    });
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

  private extractMatchedKeywordObjects(
    ...candidates: unknown[]
  ): { keyword: string }[] {
    const matchedKeywords = candidates.find((candidate) =>
      Array.isArray(candidate),
    );
    if (!Array.isArray(matchedKeywords)) {
      return [];
    }

    return matchedKeywords
      .map((item) => {
        if (typeof item === 'string') {
          return { keyword: item };
        }
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const record = item as Record<string, unknown>;
        return typeof record.keyword === 'string'
          ? { keyword: record.keyword }
          : null;
      })
      .filter((item): item is { keyword: string } => item !== null)
      .map((item) => ({ keyword: item.keyword.trim() }))
      .filter((item) => item.keyword.length > 0);
  }

  private extractProfileMatchedKeywordObjects(
    ...candidates: unknown[]
  ): ProfileMatchedKeyword[] {
    const matchedKeywords = candidates.find((candidate) =>
      Array.isArray(candidate),
    );
    if (!Array.isArray(matchedKeywords)) {
      return [];
    }

    return matchedKeywords
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        if (
          typeof record.category !== 'string' ||
          typeof record.id !== 'number' ||
          typeof record.keyword !== 'string' ||
          typeof record.score !== 'number'
        ) {
          return null;
        }

        return {
          category: record.category,
          id: record.id,
          keyword: record.keyword.trim(),
          score: record.score,
        };
      })
      .filter((item): item is ProfileMatchedKeyword => item !== null)
      .filter((item) => item.keyword.length > 0);
  }
}
