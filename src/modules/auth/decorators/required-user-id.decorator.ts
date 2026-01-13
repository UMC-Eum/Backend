import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthRequest } from './auth-user.types';

export const RequiredUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<Request & AuthRequest>();
    const userId = request.user?.userId;
    if (typeof userId !== 'number') {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }
    return userId;
  },
);
