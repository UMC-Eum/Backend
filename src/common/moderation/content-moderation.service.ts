import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    const moderationInput: OpenAiModerationInput[] = [
      ...texts.map((text) => ({ type: 'text' as const, text })),
      ...(await Promise.all(
        imageUrls.map(async (imageUrl) => ({
          type: 'image_url' as const,
          image_url: {
            url:
              (await this.s3ObjectUrlService.toClientUrl(imageUrl)) ?? imageUrl,
          },
        })),
      )),
    ];

    const model = this.configService.get<string>(
      'OPENAI_MODERATION_MODEL',
      'omni-moderation-latest',
    );

    let response: Response;
    try {
      response = await fetch(this.moderationUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: moderationInput,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `OpenAI moderation request failed surface=${input.surface} userId=${input.userId ?? 'N/A'}: ${String(error)}`,
      );
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      this.logger.warn(
        `OpenAI moderation rejected status=${response.status} surface=${input.surface} userId=${input.userId ?? 'N/A'} body=${message.slice(0, 300)}`,
      );
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    const data = (await response.json()) as OpenAiModerationResponse;
    const flagged = data.results?.find((result) => result.flagged);

    if (!flagged) {
      return;
    }

    const categories = flagged.categories ?? {};
    const violatedCategories = Object.entries(categories)
      .filter(([, isViolated]) => isViolated)
      .map(
        ([category]) =>
          VIOLATION_CATEGORY_LABELS[category] ??
          (category as ModerationViolationCategory),
      );

    throw new AppException('CONTENT_POLICY_VIOLATION', {
      details: {
        surface: input.surface,
        violatedCategories,
      },
    });
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
}
