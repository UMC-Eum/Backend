import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActiveStatus,
  AddressLevel,
  AuthProvider,
  Prisma,
  Sex,
} from '@prisma/client';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from './jwt-token.service';
import { AppException } from '../../../common/errors/app.exception';
import { KakaoLoginRequestDto } from '../dtos/kakao-login-request.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';

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
    gender?: string;
    birthday?: string;
    birthyear?: string;
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
    const { birthdate, age } = this.buildBirthInfo(
      profile.kakao_account?.birthyear,
      profile.kakao_account?.birthday,
    );
    const sex = this.mapSex(profile.kakao_account?.gender);

    const userRecord = await this.upsertUser({
      providerUserId,
      nickname,
      email,
      birthdate,
      age,
      sex,
    });

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

  private async upsertUser({
    providerUserId,
    nickname,
    email,
    birthdate,
    age,
    sex,
  }: {
    providerUserId: string;
    nickname: string;
    email: string;
    birthdate?: Date;
    age?: number;
    sex?: Sex;
  }) {
    await this.ensureDefaultAddress();
    const where = {
      provider_providerUserId: {
        provider: AuthProvider.KAKAO,
        providerUserId,
      },
    };

    try {
      const createdUser = await this.prismaService.user.create({
        data: {
          birthdate: birthdate ?? KakaoAuthService.DEFAULT_BIRTHDATE,
          age: age ?? undefined,
          email,
          nickname,
          introVoiceUrl: KakaoAuthService.DEFAULT_INTRO_VOICE_URL,
          introText: '',
          profileImageUrl: KakaoAuthService.DEFAULT_PROFILE_IMAGE_URL,
          code: KakaoAuthService.DEFAULT_ADDRESS_CODE,
          provider: AuthProvider.KAKAO,
          providerUserId,
          sex: sex ?? undefined,
          vibeVector: {},
        },
      });

      return { user: createdUser, isNewUser: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const updatedUser = await this.prismaService.user.update({
          where,
          data: {
            email,
            nickname,
            ...(birthdate ? { birthdate } : {}),
            ...(typeof age === 'number' ? { age } : {}),
            ...(sex ? { sex } : {}),
          },
        });

        return { user: updatedUser, isNewUser: false };
      }

      throw error;
    }
  }

  private async rotateRefreshTokens(refreshToken: string, userId: number) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = this.jwtTokenService.verify(refreshToken, refreshSecret);
    const expiresAt = new Date(payload.exp * 1000);

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prismaService.$transaction(
      async (tx) => {
        const existingToken = await tx.refreshToken.findUnique({
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

        await tx.refreshToken.updateMany({
          where: { userId: BigInt(userId), revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.refreshToken.create({
          data: {
            userId: BigInt(userId),
            tokenHash,
            expiresAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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

    const reportCount = await this.prismaService.report.count({
      where: { reportedId: BigInt(userId), deletedAt: null },
    });

    if (reportCount >= reportLimit) {
      await this.prismaService.user.update({
        where: { id: BigInt(userId) },
        data: { status: ActiveStatus.INACTIVE },
      });
      throw new AppException('AUTH_USER_BLOCKED');
    }
  }

  private buildBirthInfo(
    birthyear?: string,
    birthday?: string,
  ): { birthdate?: Date; age?: number } {
    if (!birthyear || !birthday || birthday.length !== 4) {
      return {};
    }

    const year = Number(birthyear);
    const month = Number(birthday.slice(0, 2));
    const day = Number(birthday.slice(2));
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return {};
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return {};
    }

    const birthdate = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(birthdate.getTime())) {
      return {};
    }

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1;
    const currentDay = today.getUTCDate();
    let age = currentYear - year;
    if (currentMonth < month || (currentMonth === month && currentDay < day)) {
      age -= 1;
    }
    if (age < 0) {
      return {};
    }

    return { birthdate, age };
  }

  private mapSex(gender?: string): Sex | undefined {
    const normalized = gender?.toLowerCase();
    if (normalized === 'male') {
      return Sex.M;
    }
    if (normalized === 'female') {
      return Sex.F;
    }
    return undefined;
  }

  private isOnboardingRequired(user: {
    birthdate: Date;
    introText: string;
    introVoiceUrl: string;
    profileImageUrl: string;
    code: string;
  }) {
    return (
      user.birthdate.getTime() ===
        KakaoAuthService.DEFAULT_BIRTHDATE.getTime() ||
      user.introText.trim() === '' ||
      user.introVoiceUrl === KakaoAuthService.DEFAULT_INTRO_VOICE_URL ||
      user.profileImageUrl === KakaoAuthService.DEFAULT_PROFILE_IMAGE_URL ||
      user.code === KakaoAuthService.DEFAULT_ADDRESS_CODE
    );
  }

  private async ensureDefaultAddress() {
    await this.prismaService.address.upsert({
      where: { code: KakaoAuthService.DEFAULT_ADDRESS_CODE },
      update: {},
      create: {
        code: KakaoAuthService.DEFAULT_ADDRESS_CODE,
        sidoCode: '00',
        sigunguCode: '000',
        emdCode: '000',
        riCode: '00',
        fullName: 'Unknown',
        sidoName: 'Unknown',
        sigunguName: null,
        emdName: null,
        riName: null,
        level: AddressLevel.SIGUNGU,
        parentCode: null,
      },
    });
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
