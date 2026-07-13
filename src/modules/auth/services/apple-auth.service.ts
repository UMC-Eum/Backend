import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus } from '@prisma/client';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  KeyObject,
} from 'crypto';
import type { JsonWebKey as CryptoJsonWebKey } from 'crypto';
import jwt from 'jsonwebtoken';
import type { JwtHeader, JwtPayload, SignOptions } from 'jsonwebtoken';
import { AppException } from '../../../common/errors/app.exception';
import { AuthRepository } from '../repositories/auth.repository';
import { AppleLoginRequestDto } from '../dtos/apple-login-request.dto';
import { AppleLoginResponseDto } from '../dtos/apple-login-response.dto';
import { JwtTokenService } from './jwt-token.service';
import { UserRepository } from '../../user/repositories/user.repository';

export type AppleLoginResult = AppleLoginResponseDto & {
  refreshToken: string;
};

type AppleJwk = CryptoJsonWebKey & {
  kid: string;
  alg?: string;
};

interface AppleJwksResponse {
  keys: AppleJwk[];
}

type AppleIdentityPayload = JwtPayload & {
  sub: string;
  email?: string;
};

type AppleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
};

@Injectable()
export class AppleAuthService {
  private static readonly APPLE_ISSUER = 'https://appleid.apple.com';
  private static readonly APPLE_JWKS_URL =
    'https://appleid.apple.com/auth/keys';
  private static readonly DEFAULT_ADDRESS_CODE = '0000000000';
  private static readonly DEFAULT_BIRTHDATE = new Date(
    '1900-01-01T00:00:00.000Z',
  );
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    'https://example.com/assets/profile-placeholder.png';
  private static readonly DEFAULT_INTRO_VOICE_URL =
    'https://example.com/assets/intro-voice-placeholder.mp3';
  private readonly logger = new Logger(AppleAuthService.name);
  private jwksCache: { keys: AppleJwk[]; expiresAt: number } | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async loginWithApple(
    request: AppleLoginRequestDto,
    clientIdOverride?: string,
  ): Promise<AppleLoginResult> {
    let phase = 'load_config';
    let providerUserId: string | undefined;

    try {
      const clientId =
        clientIdOverride ?? this.configService.get<string>('APPLE_CLIENT_ID');

      if (!clientId) {
        throw new AppException('SERVER_TEMPORARY_ERROR', {
          message: 'Apple client ID is not configured.',
        });
      }

      phase = 'verify_identity_token';
      const identity = await this.verifyIdentityToken(
        request.identityToken,
        clientId,
      );

      providerUserId = identity.sub;
      const nickname =
        request.name?.trim() || `apple_${providerUserId.slice(0, 8)}`;
      const appleEmail = request.email?.trim() || identity.email || null;
      const email = appleEmail ?? `apple-${providerUserId}@apple.local`;

      phase = 'upsert_user';
      const userRecord = await this.userRepository.upsertAppleUser({
        providerUserId,
        nickname,
        email,
        shouldUpdateEmail: Boolean(appleEmail),
        defaultBirthdate: AppleAuthService.DEFAULT_BIRTHDATE,
        defaultAddressCode: AppleAuthService.DEFAULT_ADDRESS_CODE,
        defaultIntroVoiceUrl: AppleAuthService.DEFAULT_INTRO_VOICE_URL,
        defaultProfileImageUrl: AppleAuthService.DEFAULT_PROFILE_IMAGE_URL,
      });

      if (!userRecord) {
        throw new AppException('SERVER_TEMPORARY_ERROR', {
          message: '애플 신규 유저 생성에 실패했습니다.',
        });
      }

      const userId = Number(userRecord.user.id) || 0;

      phase = 'ensure_user_can_login';
      await this.ensureUserCanLogin(userId, userRecord.user.status);

      const payload = {
        sub: userId,
        provider: 'apple',
      };

      phase = 'issue_tokens';
      const accessExpiresIn = this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '1h',
      ) as SignOptions['expiresIn'];
      const accessToken = this.jwtTokenService.sign(
        payload,
        this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'dev-access-secret',
        ),
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

      phase = 'rotate_refresh_token';
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
    } catch (error) {
      this.logger.error(
        `Apple login failed at ${phase}. ${this.formatLoginError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async verifyIdentityToken(
    identityToken: string,
    clientId: string,
  ): Promise<AppleIdentityPayload> {
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new AppException('AUTH_APPLE_TOKEN_INVALID');
    }

    const header: JwtHeader = decoded.header;
    if (!header.kid) {
      throw new AppException('AUTH_APPLE_TOKEN_INVALID');
    }

    const publicKey = await this.getApplePublicKey(header.kid);

    try {
      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: AppleAuthService.APPLE_ISSUER,
      });

      if (typeof payload === 'string' || !payload.sub) {
        throw new AppException('AUTH_APPLE_TOKEN_INVALID');
      }

      return payload as AppleIdentityPayload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('AUTH_APPLE_TOKEN_INVALID', { details: error });
    }
  }

  private async getApplePublicKey(kid: string): Promise<KeyObject> {
    const jwks = await this.getAppleJwks();
    const jwk = jwks.keys.find((key) => key.kid === kid);

    if (!jwk) {
      this.jwksCache = null;
      const refreshedJwks = await this.getAppleJwks();
      const refreshedJwk = refreshedJwks.keys.find((key) => key.kid === kid);
      if (!refreshedJwk) {
        throw new AppException('AUTH_APPLE_TOKEN_INVALID', {
          message: 'Apple public key was not found.',
        });
      }
      return createPublicKey({ key: refreshedJwk, format: 'jwk' });
    }

    return createPublicKey({ key: jwk, format: 'jwk' });
  }

  private async getAppleJwks(): Promise<AppleJwksResponse> {
    const now = Date.now();
    if (this.jwksCache && this.jwksCache.expiresAt > now) {
      return { keys: this.jwksCache.keys };
    }

    let response: Response;
    try {
      response = await fetch(AppleAuthService.APPLE_JWKS_URL);
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AppException('AUTH_APPLE_TOKEN_EXCHANGE_FAILED', {
        details: body,
      });
    }

    const jwks = (await response.json()) as AppleJwksResponse;
    this.jwksCache = {
      keys: jwks.keys,
      expiresAt: now + 60 * 60 * 1000,
    };

    return jwks;
  }

  async revokeAuthorizationCode(
    authorizationCode: string,
    clientIdOverride?: string,
  ): Promise<void> {
    const clientId =
      clientIdOverride ?? this.configService.get<string>('APPLE_CLIENT_ID');

    if (!clientId) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple client ID is not configured.',
      });
    }

    const tokenResponse = await this.exchangeAuthorizationCode(
      authorizationCode,
      clientId,
    );
    const token = tokenResponse.refresh_token ?? tokenResponse.access_token;
    const tokenTypeHint = tokenResponse.refresh_token
      ? 'refresh_token'
      : 'access_token';

    if (!token) {
      throw new AppException('AUTH_APPLE_TOKEN_EXCHANGE_FAILED', {
        message: 'Apple token response did not include a revocable token.',
      });
    }

    await this.revokeToken(token, tokenTypeHint, clientId);
  }

  private async exchangeAuthorizationCode(
    authorizationCode: string,
    clientId: string,
  ): Promise<AppleTokenResponse> {
    const clientSecret = this.buildClientSecret(clientId);
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: clientId,
      client_secret: clientSecret,
    });

    let response: Response;
    try {
      response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 400 || response.status === 401) {
        throw new AppException('AUTH_APPLE_TOKEN_INVALID', { details: body });
      }
      throw new AppException('AUTH_APPLE_TOKEN_EXCHANGE_FAILED', {
        details: body,
      });
    }

    return (await response.json()) as AppleTokenResponse;
  }

  private async revokeToken(
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token',
    clientId: string,
  ): Promise<void> {
    const clientSecret = this.buildClientSecret(clientId);
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokenTypeHint,
    });

    let response: Response;
    try {
      response = await fetch('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 400 || response.status === 401) {
        throw new AppException('AUTH_APPLE_TOKEN_INVALID', { details: body });
      }
      throw new AppException('AUTH_APPLE_TOKEN_EXCHANGE_FAILED', {
        details: body,
      });
    }
  }

  private normalizePrivateKey(privateKey: string | undefined): string | null {
    if (!privateKey) {
      return null;
    }

    const unquoted = privateKey.trim().replace(/^['"]|['"]$/g, '');
    const maybePem = unquoted.includes('BEGIN')
      ? unquoted
      : Buffer.from(unquoted, 'base64').toString('utf8');

    return maybePem
      .trim()
      .replaceAll('\\\\n', '\n')
      .replaceAll('\\n', '\n')
      .replaceAll('\r\n', '\n');
  }

  private buildClientSecret(clientId: string): string {
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const privateKey = this.normalizePrivateKey(
      this.configService.get<string>('APPLE_PRIVATE_KEY'),
    );

    if (!teamId || !keyId || !privateKey) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple token exchange credentials are not configured.',
      });
    }

    try {
      return jwt.sign(
        {
          iss: teamId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          aud: AppleAuthService.APPLE_ISSUER,
          sub: clientId,
        },
        createPrivateKey(privateKey),
        {
          algorithm: 'ES256',
          keyid: keyId,
        },
      );
    } catch (error) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple private key is invalid.',
        details: error,
      });
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

    const reportCount =
      await this.userRepository.countActiveReportsByUserId(userId);

    if (reportCount >= reportLimit) {
      await this.userRepository.markInactive(userId);
      throw new AppException('AUTH_USER_BLOCKED');
    }
  }

  private isOnboardingRequired(user: {
    birthdate: Date;
    introText: string;
    introVoiceUrl: string;
    profileImageUrl: string;
    code: string | null;
  }) {
    return (
      user.birthdate.getTime() ===
        AppleAuthService.DEFAULT_BIRTHDATE.getTime() ||
      user.introText.trim() === '' ||
      user.introVoiceUrl === AppleAuthService.DEFAULT_INTRO_VOICE_URL ||
      user.profileImageUrl === AppleAuthService.DEFAULT_PROFILE_IMAGE_URL ||
      user.code === null ||
      user.code === AppleAuthService.DEFAULT_ADDRESS_CODE
    );
  }

  private formatLoginError(error: unknown): string {
    if (error instanceof AppException) {
      const response = error.getResponse();
      return `internalCode=${error.internalCode}, response=${JSON.stringify(response)}`;
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return String(error);
  }
}
