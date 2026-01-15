import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppException } from '../errors/app.exception';

//DEV ONLY(Auth 전): x-user-id 헤더에서 userId를 읽는다.
//Auth 붙이면 이 데코레이터만 교체하면 됨.
export const DevUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest<{
      headers?: Record<string, unknown>;
    }>();

    const headers = req.headers ?? {};
    const raw = headers['x-user-id'];

    if (raw === undefined || raw === null || raw === '') {
      throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
        message: 'DEV ONLY: x-user-id 헤더가 필요합니다.',
      });
    }

    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'DEV ONLY: x-user-id 형식이 올바르지 않습니다.',
      });
    }

    return n;
  },
);
