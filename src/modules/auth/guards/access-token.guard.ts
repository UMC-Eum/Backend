import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, ActiveStatus } from '@prisma/client';
import type { Request } from 'express';
import { AppException } from '../../../common/errors/app.exception';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type {
  AuthRequest,
  AuthenticatedUser,
} from '../decorators/auth-user.types';
import { JwtTokenService } from '../services/jwt-token.service';

const BEARER_PREFIX = 'Bearer ';

function parseAuthorizationHeader(value: string | undefined): string | null {
  if (!value || !value.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = value.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

function normalizeProvider(provider: string): AuthProvider {
  if (provider.toLowerCase() === 'kakao') {
    return AuthProvider.KAKAO;
  }
  return AuthProvider.KAKAO;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & AuthRequest>();
    const token = parseAuthorizationHeader(request.headers.authorization);

    if (!token) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const secret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret',
    );
    const payload = this.jwtTokenService.verify(token, secret);

    const userRecord = await this.prismaService.user.findFirst({
      where: {
        id: BigInt(payload.sub),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: {
        id: true,
        provider: true,
      },
    });

    if (!userRecord) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const user: AuthenticatedUser = {
      userId: Number(userRecord.id),
      provider: userRecord.provider ?? normalizeProvider(payload.provider),
    };

    request.user = user;
    request.accessToken = token;

    return true;
  }
}
