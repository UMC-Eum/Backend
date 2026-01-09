import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AuthTokenPayload, JwtTokenService } from './jwt-token.service';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly prismaService: PrismaService,
  ) {}

  async refreshTokens(refreshToken: string) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    await this.assertRefreshTokenActive(refreshToken, payload.sub);
    const tokenPayload: AuthTokenPayload = {
      sub: payload.sub,
      provider: payload.provider,
    };

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '1h',
    ) as SignOptions['expiresIn'];
    const accessToken = this.jwtTokenService.sign(
      tokenPayload,
      this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      accessExpiresIn,
    );

    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '14d',
    ) as SignOptions['expiresIn'];
    const nextRefreshToken = this.jwtTokenService.sign(
      tokenPayload,
      refreshSecret,
      refreshExpiresIn,
    );

    const revokedCount = await this.revokeAllUserTokens(payload.sub);
    if (revokedCount === 0) {
      this.logger.warn('No active refresh tokens to revoke during rotation.', {
        userId: payload.sub,
      });
    }
    await this.storeRefreshToken(nextRefreshToken, payload.sub);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );

    this.jwtTokenService.verify(refreshToken, refreshSecret);
    await this.revokeRefreshToken(refreshToken);
  }

  private async assertRefreshTokenActive(refreshToken: string, userId: number) {
    const tokenHash = this.hashToken(refreshToken);
    const existingToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existingToken || String(existingToken.userId) !== String(userId)) {
      throw new UnauthorizedException();
    }

    if (existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }
  }

  private async revokeRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const result = await this.prismaService.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      this.logger.warn('Refresh token already revoked or not found.', {
        tokenHash,
      });
      throw new UnauthorizedException();
    }
  }

  async revokeAllUserTokens(userId: number) {
    const result = await this.prismaService.refreshToken.updateMany({
      where: { userId: BigInt(userId), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  private async storeRefreshToken(refreshToken: string, userId: number) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    const expiresAt = new Date(payload.exp * 1000);

    const tokenHash = this.hashToken(refreshToken);
    const existingToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (existingToken) {
      this.logger.warn('Refresh token hash collision detected.', {
        userId,
        tokenHash,
      });
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Refresh token collision detected.',
      });
    }

    await this.prismaService.refreshToken.create({
      data: {
        userId: BigInt(userId),
        tokenHash,
        expiresAt,
      },
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
