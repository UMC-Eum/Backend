import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import type { AuthRequest } from '../../modules/auth/decorators/auth-user.types';
import { ContentModerationService } from './content-moderation.service';
import { MODERATE_CONTENT_METADATA } from './moderate-content.decorator';
import type { ModerateContentOptions } from './content-moderation.types';

type RequestBody = Record<string, unknown>;

function isRequestBody(value: unknown): value is RequestBody {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class ContentModerationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly moderationService: ContentModerationService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const options = this.reflector.getAllAndOverride<ModerateContentOptions>(
      MODERATE_CONTENT_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & AuthRequest & { body?: RequestBody }>();
    const body = isRequestBody(request.body) ? request.body : {};

    await this.moderationService.assertAllowed({
      userId: request.user?.userId ?? null,
      surface: options.surface,
      texts: this.collectStringValues(body, options.textFields),
      imageUrls: this.collectStringValues(body, options.imageFields),
    });

    return next.handle();
  }

  private collectStringValues(
    body: RequestBody,
    fields: string[] | undefined,
  ): string[] {
    const values: string[] = [];

    for (const field of fields ?? []) {
      const value = body[field];
      if (typeof value === 'string') {
        values.push(value);
      } else if (Array.isArray(value)) {
        values.push(
          ...value.filter((item): item is string => typeof item === 'string'),
        );
      }
    }

    return values;
  }
}
