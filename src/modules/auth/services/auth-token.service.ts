import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload, JwtTokenService } from './jwt-token.service';
import { AppException } from '../../../common/errors/app.exception';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly authRepository: AuthRepository,
  ) {}

  async refreshTokens(refreshToken: string) {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    await this.assertRefreshTokenActive(refreshToken, payload.sub);
    const tokenPayload: AuthTokenPayload = {
      sub: payload.sub,
      provider: payload.provider,
    };

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as SignOptions['expiresIn'];
    const accessToken = this.jwtTokenService.sign(
      tokenPayload,
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      accessExpiresIn,
    );

    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
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
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    this.jwtTokenService.verify(refreshToken, refreshSecret);
    await this.revokeRefreshToken(refreshToken);
  }

  private async assertRefreshTokenActive(refreshToken: string, userId: number) {
    const tokenHash = this.hashToken(refreshToken);
    const existingToken =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!existingToken || String(existingToken.userId) !== String(userId)) {
      throw new UnauthorizedException();
    }

    if (existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }
  }

  private async revokeRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const revokedCount =
      await this.authRepository.revokeRefreshTokenByHash(tokenHash);
    if (revokedCount === 0) {
      this.logger.warn('Refresh token already revoked or not found.', {
        tokenHash,
      });
      throw new UnauthorizedException();
    }
  }

  async revokeAllUserTokens(userId: number) {
    return this.authRepository.revokeAllUserTokens(userId);
  }

  private async storeRefreshToken(refreshToken: string, userId: number) {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    const expiresAt = new Date(payload.exp * 1000);

    const tokenHash = this.hashToken(refreshToken);
    const existingToken =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (existingToken) {
      this.logger.warn('Refresh token hash collision detected.', {
        userId,
        tokenHash,
      });
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Refresh token collision detected.',
      });
    }

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
