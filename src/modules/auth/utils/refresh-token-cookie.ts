import type { CookieOptions, Request } from 'express';
import { ConfigService } from '@nestjs/config';

const DEFAULT_REFRESH_COOKIE_PATH = '/api/v1/auth';

type SameSiteOption = 'lax' | 'strict' | 'none';
type CookieBag = Record<string, string> & { refresh_token?: string };

function normalizeSameSite(value: string): SameSiteOption {
  const lower = value.toLowerCase();

  if (lower === 'none') return 'none';
  if (lower === 'strict') return 'strict';

  return 'lax';
}

export function buildRefreshTokenCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const sameSite = normalizeSameSite(
    configService.get<string>('REFRESH_TOKEN_COOKIE_SAMESITE', 'lax'),
  );
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const secureConfig =
    configService.get<string>(
      'REFRESH_TOKEN_COOKIE_SECURE',
      isProduction ? 'true' : 'false',
    ) === 'true';
  const secure = sameSite === 'none' ? true : secureConfig;
  const refreshExpiresIn = configService.get<string>(
    'JWT_REFRESH_EXPIRES_IN',
    '14d',
  );
  const refreshLifetimeSeconds = parseExpiresInSeconds(refreshExpiresIn);
  const maxAge = refreshLifetimeSeconds * 1000;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: configService.get<string>(
      'REFRESH_TOKEN_COOKIE_PATH',
      DEFAULT_REFRESH_COOKIE_PATH,
    ),
    maxAge,
    expires: new Date(Date.now() + maxAge),
  };
}

function parseExpiresInSeconds(expiresIn: string): number {
  const trimmed = expiresIn.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = trimmed.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 14 * 24 * 60 * 60;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const unitSeconds: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return amount * unitSeconds[unit];
}

export function extractRefreshToken(req: Request): string | undefined {
  const cookieBag = (req as Request & { cookies?: unknown }).cookies as
    | CookieBag
    | undefined;

  const token = cookieBag?.refresh_token;
  if (typeof token === 'string' && token.length > 0) {
    return token;
  }

  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';').map((entry) => entry.trim());
  const refreshPair = cookies.find((entry) =>
    entry.startsWith('refresh_token='),
  );

  if (!refreshPair) {
    return undefined;
  }

  return decodeURIComponent(refreshPair.split('=').slice(1).join('='));
}
