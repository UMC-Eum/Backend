import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { promisify } from 'util';
import {
  EmailSignupRequestDto,
  SendEmailVerificationCodeResponseDto,
  VerifyEmailCodeResponseDto,
} from '../dtos/email-auth.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { AppException } from '../../../common/errors/app.exception';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtTokenService } from './jwt-token.service';
import { MailService } from './mail.service';

const scrypt = promisify(nodeScrypt);

export type EmailSignupResult = KakaoLoginResponseDto & {
  refreshToken: string;
};

@Injectable()
export class EmailAuthService {
  private static readonly SIGNUP_PURPOSE = 'SIGNUP';
  private static readonly MAX_VERIFY_ATTEMPTS = 5;
  private static readonly SIGNUP_VERIFICATION_WINDOW_MINUTES = 30;

  constructor(
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly mailService: MailService,
  ) {}

  async sendVerificationCode(
    email: string,
  ): Promise<SendEmailVerificationCodeResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateVerificationCode();
    const ttlMinutes = this.configService.get<number>(
      'EMAIL_VERIFICATION_TTL_MINUTES',
      10,
    );

    await this.authRepository.createEmailVerification({
      email: normalizedEmail,
      codeHash: this.hashVerificationCode(normalizedEmail, code),
      purpose: EmailAuthService.SIGNUP_PURPOSE,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    await this.mailService.sendVerificationCode(normalizedEmail, code);

    return {
      expiresInMinutes: ttlMinutes,
    };
  }

  async verifyCode(
    email: string,
    code: string,
  ): Promise<VerifyEmailCodeResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const verification =
      await this.authRepository.findLatestPendingEmailVerification({
        email: normalizedEmail,
        purpose: EmailAuthService.SIGNUP_PURPOSE,
      });

    if (!verification) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '유효하지 않은 인증번호입니다.',
      });
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '만료된 인증번호입니다.',
      });
    }

    if (verification.attemptCount >= EmailAuthService.MAX_VERIFY_ATTEMPTS) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '인증번호 입력 횟수를 초과했습니다. 다시 요청해 주세요.',
      });
    }

    const matches = this.verifyHashedCode(
      normalizedEmail,
      code,
      verification.codeHash,
    );

    if (!matches) {
      await this.authRepository.incrementEmailVerificationAttempt(
        verification.id,
      );
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '유효하지 않은 인증번호입니다.',
      });
    }

    await this.authRepository.markEmailVerificationVerified(
      verification.id,
      new Date(),
    );

    return { verified: true };
  }

  async signup(dto: EmailSignupRequestDto): Promise<EmailSignupResult> {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findActiveUserByEmail(email);
    const existingLocalAccount =
      await this.authRepository.findLocalAuthAccountByUsername(email);
    if (existingUser || existingLocalAccount) {
      throw new AppException('AUTH_EMAIL_ALREADY_EXISTS');
    }

    const verifiedAfter = new Date(
      Date.now() -
        EmailAuthService.SIGNUP_VERIFICATION_WINDOW_MINUTES * 60 * 1000,
    );
    const verification =
      await this.authRepository.findLatestReusableVerifiedEmailVerification({
        email,
        purpose: EmailAuthService.SIGNUP_PURPOSE,
        verifiedAfter,
      });
    if (!verification) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '이메일 인증을 먼저 완료해 주세요.',
      });
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.authRepository.createEmailUserWithLocalAccount({
      email,
      passwordHash,
      verificationId: verification.id,
    });

    const userId = Number(user.id);
    const refreshToken = await this.issueRefreshToken(userId);

    return {
      accessToken: this.issueAccessToken(userId),
      refreshToken,
      isNewUser: true,
      onboardingRequired: true,
      user: {
        userId,
        nickname: user.nickname,
      },
    };
  }

  private generateVerificationCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashVerificationCode(email: string, code: string): string {
    const pepper = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    return createHash('sha256')
      .update(`${email}:${code}:${pepper}`)
      .digest('hex');
  }

  private verifyHashedCode(
    email: string,
    code: string,
    expectedHash: string,
  ): boolean {
    const actualHash = this.hashVerificationCode(email, code);
    const actual = Buffer.from(actualHash);
    const expected = Buffer.from(expectedHash);

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = (await scrypt(password, salt, 64)) as Buffer | string;
    const hashBuffer = Buffer.isBuffer(hash) ? hash : Buffer.from(hash);

    return `scrypt$${salt.toString('base64url')}$${hashBuffer.toString(
      'base64url',
    )}`;
  }

  private issueAccessToken(userId: number): string {
    const payload = {
      sub: userId,
      provider: 'local',
    };
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as SignOptions['expiresIn'];

    return this.jwtTokenService.sign(
      payload,
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      accessExpiresIn,
    );
  }

  private async issueRefreshToken(userId: number): Promise<string> {
    const payload = {
      sub: userId,
      provider: 'local',
    };
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as SignOptions['expiresIn'];
    const refreshToken = this.jwtTokenService.sign(
      payload,
      refreshSecret,
      refreshExpiresIn,
    );
    const verifiedPayload = this.jwtTokenService.verify(
      refreshToken,
      refreshSecret,
    );
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const result = await this.authRepository.rotateRefreshToken({
      userId,
      tokenHash,
      expiresAt: new Date(verifiedPayload.exp * 1000),
    });

    if (!result.created) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Refresh token collision detected.',
      });
    }

    return refreshToken;
  }
}
