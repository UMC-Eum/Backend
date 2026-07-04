import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { ActiveStatus } from '@prisma/client';
import { AppleAuthService } from './apple-auth.service';

describe('AppleAuthService', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const publicJwk = publicKey.export({ format: 'jwk' });
  const kid = 'apple-test-key';
  const clientId = 'com.eum.app';

  const configServiceMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        APPLE_CLIENT_ID: clientId,
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '14d',
      };

      return values[key] ?? defaultValue;
    }),
  };
  const jwtTokenServiceMock = {
    sign: jest.fn((payload: { provider: string }) =>
      payload.provider === 'apple' ? 'signed-token' : 'unknown-token',
    ),
    verify: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 3600 })),
  };
  const userRepositoryMock = {
    upsertAppleUser: jest.fn(),
    countActiveReportsByUserId: jest.fn(),
    markInactive: jest.fn(),
  };
  const authRepositoryMock = {
    rotateRefreshToken: jest.fn(),
  };

  let service: AppleAuthService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => ({
        keys: [
          {
            ...publicJwk,
            kid,
            alg: 'RS256',
            use: 'sig',
          },
        ],
      }),
    });
    global.fetch = fetchMock;

    userRepositoryMock.upsertAppleUser.mockResolvedValue({
      isNewUser: true,
      user: {
        id: 7n,
        nickname: '애플유저',
        status: ActiveStatus.ACTIVE,
        birthdate: new Date('1900-01-01T00:00:00.000Z'),
        introText: '',
        introVoiceUrl: 'https://example.com/assets/intro-voice-placeholder.mp3',
        profileImageUrl: 'https://example.com/assets/profile-placeholder.png',
        code: '0000000000',
      },
    });
    userRepositoryMock.countActiveReportsByUserId.mockResolvedValue(0);
    authRepositoryMock.rotateRefreshToken.mockResolvedValue({ created: true });

    service = new AppleAuthService(
      configServiceMock as never,
      jwtTokenServiceMock as never,
      userRepositoryMock as never,
      authRepositoryMock as never,
    );
  });

  function signIdentityToken(overrides: Record<string, unknown> = {}) {
    return jwt.sign(
      {
        iss: 'https://appleid.apple.com',
        aud: clientId,
        sub: 'apple-sub-123',
        email: 'apple@example.com',
        ...overrides,
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: kid,
        expiresIn: '1h',
      },
    );
  }

  it('애플 identity token을 검증하고 신규 유저 로그인 응답을 반환한다', async () => {
    const result = await service.loginWithApple({
      identityToken: signIdentityToken(),
      name: '애플유저',
    });

    expect(userRepositoryMock.upsertAppleUser).toHaveBeenCalledWith(
      expect.objectContaining({
        providerUserId: 'apple-sub-123',
        email: 'apple@example.com',
        shouldUpdateEmail: true,
        nickname: '애플유저',
      }),
    );
    expect(authRepositoryMock.rotateRefreshToken).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
      isNewUser: true,
      onboardingRequired: true,
      user: {
        userId: 7,
        nickname: '애플유저',
      },
    });
  });

  it('audience가 다르면 로그인할 수 없다', async () => {
    await expect(
      service.loginWithApple({
        identityToken: signIdentityToken({ aud: 'wrong-client-id' }),
      }),
    ).rejects.toMatchObject({
      internalCode: 'AUTH_APPLE_TOKEN_INVALID',
    });

    expect(userRepositoryMock.upsertAppleUser).not.toHaveBeenCalled();
  });
});
