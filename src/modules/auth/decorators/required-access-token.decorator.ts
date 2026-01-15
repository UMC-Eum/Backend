import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthRequest } from './auth-user.types';

const BEARER_PREFIX = 'Bearer ';

function parseAuthorizationHeader(value: string | undefined): string | null {
  if (!value || !value.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = value.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export const RequiredAccessToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & AuthRequest>();
    const headerToken = parseAuthorizationHeader(request.headers.authorization);
    const accessToken = headerToken ?? request.accessToken ?? null;
    if (!accessToken) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }
    return accessToken;
  },
);
