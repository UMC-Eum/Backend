import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap, type Observable } from 'rxjs';
import type { ApiSuccessResponse } from '../dto/api-response.dto';
import { S3ObjectUrlService } from '../s3/s3-object-url.service';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  constructor(private readonly s3ObjectUrlService: S3ObjectUrlService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const req = context
      .switchToHttp()
      .getRequest<{ originalUrl?: string; url?: string }>();

    return next.handle().pipe(
      mergeMap(async (data) => {
        const payload = data === undefined ? ({} as unknown as T) : data;
        const transformedPayload =
          await this.s3ObjectUrlService.transformClientUrlFields(payload);

        return {
          resultType: 'SUCCESS' as const,
          success: { data: transformedPayload },
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            path: req?.originalUrl ?? req?.url ?? '',
          },
        };
      }),
    );
  }
}
