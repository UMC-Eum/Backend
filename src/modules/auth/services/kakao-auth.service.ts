import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from './jwt-token.service';
import { AppException } from '../../../common/errors/app.exception';
import { KakaoLoginRequestDto } from '../dtos/kakao-login-request.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';

export type KakaoLoginResult = KakaoLoginResponseDto & {
  refreshToken: string;
};

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface KakaoProfileResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

@Injectable()
export class KakaoAuthService {
  private static readonly DEFAULT_ADDRESS_CODE = '0000000000';
  private static readonly DEFAULT_BIRTHDATE = new Date(
    '1900-01-01T00:00:00.000Z',
  );
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    'https://example.com/assets/profile-placeholder.png';
  private static readonly DEFAULT_INTRO_VOICE_URL =
    'https://example.com/assets/intro-voice-placeholder.mp3';
  private readonly logger = new Logger(KakaoAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly prismaService: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async loginWithKakao(
    request: KakaoLoginRequestDto,
  ): Promise<KakaoLoginResult> {
    const clientId = this.configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');

    if (!clientId) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Kakao client ID is not configured.',
      });
    }

    const token = await this.fetchKakaoToken(request, clientId, clientSecret);
    const profile = await this.fetchKakaoProfile(token.access_token);

    const providerUserId = String(profile.id ?? '');
    const nicknameFromProfile =
      profile.kakao_account?.profile?.nickname ?? null;
    const nickname = nicknameFromProfile ?? `kakao_${providerUserId}`;
    const email =
      profile.kakao_account?.email ?? `kakao-${providerUserId}@kakao.local`;

    const userRecord = await this.userRepository.upsertKakaoUser({
      providerUserId,
      nickname,
      email,
      defaultBirthdate: KakaoAuthService.DEFAULT_BIRTHDATE,
      defaultAddressCode: KakaoAuthService.DEFAULT_ADDRESS_CODE,
      defaultIntroVoiceUrl: KakaoAuthService.DEFAULT_INTRO_VOICE_URL,
      defaultProfileImageUrl: KakaoAuthService.DEFAULT_PROFILE_IMAGE_URL,
    });

    if (!userRecord) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: '카카오 신규 유저 생성에 실패했습니다.',
      });
    }

    const userId = Number(userRecord.user.id) || 0;
    await this.ensureUserCanLogin(userId, userRecord.user.status);

    const payload = {
      sub: userId,
      provider: 'kakao',
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

    const onboardingRequired = this.isOnboardingRequired(userRecord.user);

    return {
      accessToken,
      refreshToken,
      isNewUser: userRecord.isNewUser,
      onboardingRequired,
      user: {
        userId,
        nickname: userRecord.user.nickname || null,
      },
    };
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

  private async ensureUserCanLogin(
    userId: number,
    status: ActiveStatus,
  ): Promise<void> {
    if (status !== ActiveStatus.ACTIVE) {
      throw new AppException('AUTH_USER_BLOCKED');
    }

    const reportLimit = Number(
      this.configService.get('MAX_REPORTS_BEFORE_BLOCK', '5'),
    );
    if (!Number.isFinite(reportLimit) || reportLimit <= 0) {
      return;
    }

    // TODO(schema): "내가 신고당한 횟수" — 옛 Report.reportedId 직접 조회 → UserReport 경유로 변경.
    const reportCount = await this.prismaService.userReport.count({
      where: {
        reportedUserId: BigInt(userId),
        report: { deletedAt: null },
      },
    });

    if (reportCount >= reportLimit) {
      await this.prismaService.user.update({
        where: { id: BigInt(userId) },
        data: { status: ActiveStatus.INACTIVE },
      });
      throw new AppException('AUTH_USER_BLOCKED');
    }
  }

  // TODO(schema-nullable): User.code가 nullable로 변경됨. code가 null이면 onboarding이 필요하다고 판단.
  private isOnboardingRequired(user: {
    birthdate: Date;
    introText: string;
    introVoiceUrl: string;
    profileImageUrl: string;
    code: string | null;
  }) {
    return (
      user.birthdate.getTime() ===
        KakaoAuthService.DEFAULT_BIRTHDATE.getTime() ||
      user.introText.trim() === '' ||
      user.introVoiceUrl === KakaoAuthService.DEFAULT_INTRO_VOICE_URL ||
      user.profileImageUrl === KakaoAuthService.DEFAULT_PROFILE_IMAGE_URL ||
      user.code === null ||
      user.code === KakaoAuthService.DEFAULT_ADDRESS_CODE
    );
  }

  private async fetchKakaoToken(
    request: KakaoLoginRequestDto,
    clientId: string,
    clientSecret?: string,
  ): Promise<KakaoTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: request.redirectUri,
      code: request.authorizationCode,
    });

    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }

    let response: Response;
    try {
      response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: params.toString(),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 400 || response.status === 401) {
        throw new AppException('AUTH_KAKAO_TOKEN_INVALID', { details: body });
      }
      throw new AppException('AUTH_KAKAO_TOKEN_EXCHANGE_FAILED', {
        details: body,
      });
    }

    return (await response.json()) as KakaoTokenResponse;
  }

  private async fetchKakaoProfile(
    accessToken: string,
  ): Promise<KakaoProfileResponse> {
    let response: Response;
    try {
      response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new AppException('AUTH_KAKAO_PROFILE_UNAUTHORIZED', {
          details: body,
        });
      }
      throw new AppException('AUTH_KAKAO_PROFILE_FETCH_FAILED', {
        details: body,
      });
    }

    return (await response.json()) as KakaoProfileResponse;
  }
}
