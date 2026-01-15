import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthenticatedUser, AuthRequest } from './auth-user.types';

export const RequiredUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request & AuthRequest>();
    const user = request.user;
    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }
    return user;
  },
);
