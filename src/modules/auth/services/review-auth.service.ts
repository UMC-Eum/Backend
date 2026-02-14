import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActiveStatus,
  AddressLevel,
  AuthProvider,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from './jwt-token.service';
import { AppException } from '../../../common/errors/app.exception';
import { ReviewLoginRequestDto } from '../dtos/review-login-request.dto';
import { ReviewLoginResponseDto } from '../dtos/review-login-response.dto';

export type ReviewLoginResult = ReviewLoginResponseDto & {
  refreshToken: string;
};

@Injectable()
export class ReviewAuthService {
  private static readonly DEFAULT_ADDRESS_CODE = '0000000000';
  private static readonly DEFAULT_BIRTHDATE = new Date(
    '1900-01-01T00:00:00.000Z',
  );
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    'https://example.com/assets/profile-placeholder.png';
  private static readonly DEFAULT_INTRO_VOICE_URL =
    'https://example.com/assets/intro-voice-placeholder.mp3';
  private readonly logger = new Logger(ReviewAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly prismaService: PrismaService,
  ) {}

  async loginWithReview(
    request: ReviewLoginRequestDto,
  ): Promise<ReviewLoginResult> {
    const email = request.email.trim().toLowerCase();
    this.assertReviewLoginAllowed(email, request.secret);
    const userRecord = await this.upsertUser(email);

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

  private assertReviewLoginAllowed(email: string, secret: string) {
    this.logger.debug(
      `process.env.REVIEW_LOGIN_ENABLED=${process.env.REVIEW_LOGIN_ENABLED}`,
    );
    this.logger.debug(
      `process.env.REVIEW_LOGIN_SECRET=${process.env.REVIEW_LOGIN_SECRET}`,
    );
    console.log(
      '[DEBUG] REVIEW_LOGIN_ENABLED',
      process.env.REVIEW_LOGIN_ENABLED,
    );
    console.log('[DEBUG] REVIEW_LOGIN_SECRET', process.env.REVIEW_LOGIN_SECRET);
    console.log(
      '[DEBUG] REVIEW_LOGIN_ALLOWED_EMAILS',
      process.env.REVIEW_LOGIN_ALLOWED_EMAILS,
    );

    const enabled = this.parseBoolean(
      this.configService.get('REVIEW_LOGIN_ENABLED', 'false'),
    );
    if (!enabled) {
      throw new AppException('AUTH_LOGIN_REQUIRED', {
        message: 'Review login is disabled.',
      });
    }

    const expectedSecret = this.configService.get<string>(
      'REVIEW_LOGIN_SECRET',
    );
    if (!expectedSecret) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Review login secret is not configured.',
      });
    }

    const allowedEmails = this.parseAllowedEmails(
      this.configService.get<string>('REVIEW_LOGIN_ALLOWED_EMAILS'),
    );
    if (allowedEmails.length === 0) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Review login allowed emails are not configured.',
      });
    }

    if (secret !== expectedSecret || !allowedEmails.includes(email)) {
      throw new AppException('AUTH_LOGIN_REQUIRED', {
        message: 'Review login is not allowed for this request.',
      });
    }
  }

  private async upsertUser(email: string) {
    await this.ensureDefaultAddress();
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { user: existingUser, isNewUser: false };
    }

    const nickname = this.buildNickname(email);
    const providerUserId = this.buildProviderUserId(email);

    const createdUser = await this.prismaService.user.create({
      data: {
        birthdate: ReviewAuthService.DEFAULT_BIRTHDATE,
        email,
        nickname,
        introVoiceUrl: ReviewAuthService.DEFAULT_INTRO_VOICE_URL,
        introText: '',
        profileImageUrl: ReviewAuthService.DEFAULT_PROFILE_IMAGE_URL,
        code: ReviewAuthService.DEFAULT_ADDRESS_CODE,
        provider: AuthProvider.KAKAO,
        providerUserId,
        vibeVector: {},
      },
    });

    return { user: createdUser, isNewUser: true };
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

  private isOnboardingRequired(user: {
    introText: string;
    introVoiceUrl: string;
    profileImageUrl: string;
    code: string;
  }) {
    return (
      user.introText.trim() === '' ||
      user.introVoiceUrl === ReviewAuthService.DEFAULT_INTRO_VOICE_URL ||
      user.profileImageUrl === ReviewAuthService.DEFAULT_PROFILE_IMAGE_URL ||
      user.code === ReviewAuthService.DEFAULT_ADDRESS_CODE
    );
  }

  private async ensureDefaultAddress() {
    await this.prismaService.address.upsert({
      where: { code: ReviewAuthService.DEFAULT_ADDRESS_CODE },
      update: {},
      create: {
        code: ReviewAuthService.DEFAULT_ADDRESS_CODE,
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

  private buildProviderUserId(email: string) {
    const hash = createHash('sha256').update(email).digest('hex');
    return `review_${hash.slice(0, 32)}`;
  }

  private buildNickname(email: string) {
    const candidate = email.split('@')[0]?.trim() || 'reviewer';
    return candidate.slice(0, 20) || 'reviewer';
  }

  private parseBoolean(value?: string | null) {
    if (!value) {
      return false;
    }
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private parseAllowedEmails(value?: string | null) {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
}
