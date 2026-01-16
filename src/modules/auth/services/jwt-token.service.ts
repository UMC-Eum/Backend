import { Injectable, Logger } from '@nestjs/common';
import {
  type Secret,
  type SignOptions,
  sign as jwtSign,
  verify as jwtVerify,
  JwtPayload,
} from 'jsonwebtoken';
import { AppException } from '../../../common/errors/app.exception';

export interface AuthTokenPayload {
  sub: number;
  provider: string;
}

type TokenPayload = Omit<JwtPayload, 'sub'> &
  AuthTokenPayload & {
    iat: number;
    exp: number;
  };

@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  sign(
    payload: AuthTokenPayload,
    secret: Secret,
    expiresIn: SignOptions['expiresIn'],
  ): string {
    if (!secret) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'JWT secret is not configured.',
      });
    }

    return jwtSign(payload, secret, {
      algorithm: 'HS256',
      expiresIn,
    });
  }

  verify(token: string, secret: string): TokenPayload {
    if (!secret) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'JWT secret is not configured.',
      });
    }

    let decoded: JwtPayload;
    try {
      const verified = jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });
      if (typeof verified === 'string') {
        throw new AppException('AUTH_SESSION_EXPIRED');
      }
      decoded = verified;
    } catch (error) {
      throw new AppException('AUTH_SESSION_EXPIRED', { details: error });
    }

    const rawPayload = decoded as JwtPayload & { userId?: number };
    let sub: number | null = null;
    if (typeof rawPayload.sub === 'number') {
      sub = rawPayload.sub;
    } else if (
      typeof rawPayload.sub === 'string' &&
      /^\d+$/.test(rawPayload.sub)
    ) {
      sub = Number(rawPayload.sub);
    } else if (typeof rawPayload.userId === 'number') {
      // Legacy payloads used `userId` instead of `sub`. Keep compatibility during migration.
      this.logger.warn('Legacy refresh token payload detected.', {
        userId: rawPayload.userId,
      });
      sub = rawPayload.userId;
    }

    const provider =
      typeof rawPayload.provider === 'string' ? rawPayload.provider : 'kakao';

    if (typeof rawPayload.exp !== 'number' || sub === null) {
      throw new AppException('AUTH_SESSION_EXPIRED');
    }

    return {
      ...rawPayload,
      sub,
      provider,
    } as TokenPayload;
  }
}
