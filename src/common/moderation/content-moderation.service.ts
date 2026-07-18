import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModerationDecision } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AppException } from '../errors/app.exception';
import { S3ObjectUrlService } from '../s3/s3-object-url.service';
import type { ModerateContentInput } from './content-moderation.types';

type OpenAiModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
  category_applied_input_types?: Record<string, string[]>;
};

type OpenAiModerationResponse = {
  id?: string;
  model?: string;
  results?: OpenAiModerationResult[];
};

type OpenAiModerationInput =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
      };
    };

type ModerationCheckPayload = {
  openAiInput: OpenAiModerationInput[];
  texts: string[];
  imageUrls: string[];
};

enum ModerationViolationCategory {
  Sexual = '성적 콘텐츠',
  SexualMinors = '미성년자 성적 콘텐츠',
  Harassment = '괴롭힘',
  HarassmentThreatening = '위협적 괴롭힘',
  Hate = '혐오 표현',
  HateThreatening = '위협적 혐오 표현',
  Illicit = '불법 행위',
  IllicitViolent = '폭력적 불법 행위',
  SelfHarm = '자해 관련 콘텐츠',
  SelfHarmIntent = '자해 의도',
  SelfHarmInstructions = '자해 방법 안내',
  Violence = '폭력적 언행',
  ViolenceGraphic = '잔혹한 폭력 콘텐츠',
}

const VIOLATION_CATEGORY_LABELS: Record<string, ModerationViolationCategory> = {
  sexual: ModerationViolationCategory.Sexual,
  'sexual/minors': ModerationViolationCategory.SexualMinors,
  harassment: ModerationViolationCategory.Harassment,
  'harassment/threatening': ModerationViolationCategory.HarassmentThreatening,
  hate: ModerationViolationCategory.Hate,
  'hate/threatening': ModerationViolationCategory.HateThreatening,
  illicit: ModerationViolationCategory.Illicit,
  'illicit/violent': ModerationViolationCategory.IllicitViolent,
  'self-harm': ModerationViolationCategory.SelfHarm,
  'self-harm/intent': ModerationViolationCategory.SelfHarmIntent,
  'self-harm/instructions': ModerationViolationCategory.SelfHarmInstructions,
  violence: ModerationViolationCategory.Violence,
  'violence/graphic': ModerationViolationCategory.ViolenceGraphic,
};

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private readonly moderationUrl = 'https://api.openai.com/v1/moderations';

  constructor(
    private readonly configService: ConfigService,
    private readonly s3ObjectUrlService: S3ObjectUrlService,
    private readonly prisma: PrismaService,
  ) {}

  async assertAllowed(input: ModerateContentInput): Promise<void> {
    const texts = this.normalizeTexts(input.texts);
    const imageUrls = this.normalizeImageUrls(input.imageUrls);

    if (texts.length === 0 && imageUrls.length === 0) {
      return;
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: '콘텐츠 검수 설정이 완료되지 않았습니다.',
      });
    }

    const model = this.configService.get<string>(
      'OPENAI_MODERATION_MODEL',
      'omni-moderation-latest',
    );

    if (texts.length > 0) {
      await this.assertPayloadAllowed({
        input,
        apiKey,
        model,
        payload: {
          openAiInput: texts.map((text) => ({ type: 'text' as const, text })),
          texts,
          imageUrls: [],
        },
      });
    }

    for (const imageUrl of imageUrls) {
      const clientUrl =
        (await this.s3ObjectUrlService.toClientUrl(imageUrl)) ?? imageUrl;

      await this.assertPayloadAllowed({
        input,
        apiKey,
        model,
        payload: {
          openAiInput: [
            {
              type: 'image_url',
              image_url: {
                url: clientUrl,
              },
            },
          ],
          texts: [],
          imageUrls: [imageUrl],
        },
      });
    }
  }

  private async assertPayloadAllowed(params: {
    input: ModerateContentInput;
    apiKey: string;
    model: string;
    payload: ModerationCheckPayload;
  }): Promise<void> {
    const data = await this.requestModeration(params);
    const results = data.results ?? [];
    const isFlagged = results.some((result) => result.flagged);
    const violatedCategories = this.collectViolatedCategories(results);

    if (!isFlagged) {
      return;
    }

    await this.recordModerationLog({
      input: params.input,
      model: data.model ?? params.model,
      providerResponseId: data.id ?? null,
      decision: ModerationDecision.BLOCK,
      texts: params.payload.texts,
      imageUrls: params.payload.imageUrls,
      violatedCategories,
      categoryScores: this.collectCategoryScores(results),
    });

    throw new AppException('CONTENT_POLICY_VIOLATION', {
      details: {
        surface: params.input.surface,
        violatedCategories,
      },
    });
  }

  private async requestModeration(params: {
    input: ModerateContentInput;
    apiKey: string;
    model: string;
    payload: ModerationCheckPayload;
  }): Promise<OpenAiModerationResponse> {
    let response: Response;
    try {
      response = await fetch(this.moderationUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          input: params.payload.openAiInput,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `OpenAI moderation request failed surface=${params.input.surface} userId=${params.input.userId ?? 'N/A'} inputTypes=${this.describeInputTypes(params.payload)}: ${String(error)}`,
      );
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      this.logger.warn(
        `OpenAI moderation rejected status=${response.status} surface=${params.input.surface} userId=${params.input.userId ?? 'N/A'} inputTypes=${this.describeInputTypes(params.payload)} body=${message.slice(0, 300)}`,
      );
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    return (await response.json()) as OpenAiModerationResponse;
  }

  private normalizeTexts(values?: string[]): string[] {
    return (values ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private normalizeImageUrls(values?: string[]): string[] {
    return (values ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private describeInputTypes(payload: ModerationCheckPayload): string {
    return [
      ...(payload.texts.length > 0 ? [`text:${payload.texts.length}`] : []),
      ...(payload.imageUrls.length > 0
        ? [`image:${payload.imageUrls.length}`]
        : []),
    ].join(',');
  }

  private collectViolatedCategories(
    results: OpenAiModerationResult[],
  ): string[] {
    const categories = new Set<string>();

    for (const result of results) {
      for (const [category, isViolated] of Object.entries(
        result.categories ?? {},
      )) {
        if (!isViolated) {
          continue;
        }
        categories.add(
          VIOLATION_CATEGORY_LABELS[category] ??
            (category as ModerationViolationCategory),
        );
      }
    }

    return [...categories];
  }

  private collectCategoryScores(
    results: OpenAiModerationResult[],
  ): Record<string, number> | null {
    const scores: Record<string, number> = {};

    for (const result of results) {
      for (const [category, score] of Object.entries(
        result.category_scores ?? {},
      )) {
        scores[category] = Math.max(scores[category] ?? 0, score);
      }
    }

    return Object.keys(scores).length > 0 ? scores : null;
  }

  private buildContentHash(texts: string[], imageUrls: string[]): string {
    return createHash('sha256')
      .update(JSON.stringify({ texts, imageUrls }))
      .digest('hex');
  }

  private async recordModerationLog(params: {
    input: ModerateContentInput;
    model: string;
    providerResponseId: string | null;
    decision: ModerationDecision;
    texts: string[];
    imageUrls: string[];
    violatedCategories: string[];
    categoryScores: Record<string, number> | null;
  }): Promise<void> {
    const inputTypes = [
      ...(params.texts.length > 0 ? ['text'] : []),
      ...(params.imageUrls.length > 0 ? ['image'] : []),
    ];

    try {
      await this.prisma.contentModerationLog.create({
        data: {
          userId: params.input.userId ? BigInt(params.input.userId) : null,
          surface: params.input.surface,
          targetType: params.input.targetType,
          targetId: params.input.targetId
            ? BigInt(params.input.targetId)
            : null,
          decision: params.decision,
          provider: 'OPENAI',
          model: params.model,
          providerResponseId: params.providerResponseId,
          violatedCategories: params.violatedCategories,
          inputTypes,
          categoryScores: params.categoryScores ?? undefined,
          contentHash: this.buildContentHash(params.texts, params.imageUrls),
          requestPath: params.input.requestPath ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `content moderation log write failed surface=${params.input.surface} userId=${params.input.userId ?? 'N/A'}: ${String(error)}`,
      );
    }
  }
}
