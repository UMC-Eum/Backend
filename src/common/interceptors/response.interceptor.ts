import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiSuccessResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const req = context
      .switchToHttp()
      .getRequest<{ originalUrl?: string; url?: string }>();

    return next.handle().pipe(
      map((data) => ({
        resultType: 'SUCCESS',
        success: { data: (data === undefined ? ({} as any) : data) },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          path: req?.originalUrl ?? req?.url ?? '',
        },
      })),
    );
  }
}
