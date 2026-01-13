import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthRequest } from './auth-user.types';

const BEARER_PREFIX = 'Bearer ';

function parseAuthorizationHeader(value: string | undefined): string | null {
  if (!value || !value.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = value.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export const CurrentAccessToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & AuthRequest>();
    const headerToken = parseAuthorizationHeader(request.headers.authorization);
    return headerToken ?? request.accessToken ?? null;
  },
);
