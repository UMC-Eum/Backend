import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus } from '@prisma/client';
import { createHash, scrypt as nodeScrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { SignOptions } from 'jsonwebtoken';
import { AppException } from '../../../common/errors/app.exception';
import { LocalLoginRequestDto } from '../dtos/local-login-request.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtTokenService } from './jwt-token.service';

const scrypt = promisify(nodeScrypt);

export type LocalLoginResult = KakaoLoginResponseDto & {
  refreshToken: string;
};

@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly authRepository: AuthRepository,
  ) {}

  async login(dto: LocalLoginRequestDto): Promise<LocalLoginResult> {
    const username = dto.username.trim();
    const account =
      await this.authRepository.findLocalAuthAccountByUsername(username);

    if (!account || !account.isActive) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const passwordMatches = await this.verifyPassword(
      dto.password,
      account.passwordHash,
    );
    if (!passwordMatches) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    if (
      account.user.deletedAt !== null ||
      account.user.status !== ActiveStatus.ACTIVE
    ) {
      throw new AppException('AUTH_USER_BLOCKED');
    }

    const userId = Number(account.user.id);
    const payload = {
      sub: userId,
      provider: 'local',
    };

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '1h',
    ) as SignOptions['expiresIn'];
    const accessToken = this.jwtTokenService.sign(
      payload,
      this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      accessExpiresIn,
    );

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '14d',
    ) as SignOptions['expiresIn'];
    const refreshToken = this.jwtTokenService.sign(
      payload,
      refreshSecret,
      refreshExpiresIn,
    );
    await this.rotateRefreshTokens(refreshToken, userId);

    return {
      accessToken,
      refreshToken,
      isNewUser: false,
      onboardingRequired: false,
      user: {
        userId,
        nickname: account.user.nickname || null,
      },
    };
  }

  private async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const parts = passwordHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      this.logger.warn('Unsupported local password hash format.');
      return false;
    }

    const salt = Buffer.from(parts[1], 'base64url');
    const expectedHash = Buffer.from(parts[2], 'base64url');
    const actualHash = (await scrypt(password, salt, expectedHash.length)) as
      | Buffer
      | string;
    const actualBuffer = Buffer.isBuffer(actualHash)
      ? actualHash
      : Buffer.from(actualHash);

    if (actualBuffer.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedHash);
  }

  private async rotateRefreshTokens(refreshToken: string, userId: number) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    const expiresAt = new Date(payload.exp * 1000);

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const result = await this.authRepository.rotateRefreshToken({
      userId,
      tokenHash,
      expiresAt,
    });

    if (!result.created) {
      this.logger.warn('Refresh token hash collision detected.', {
        userId,
        tokenHash,
      });
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Refresh token collision detected.',
      });
    }
  }
}
