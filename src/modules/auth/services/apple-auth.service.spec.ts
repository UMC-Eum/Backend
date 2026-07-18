import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { ActiveStatus } from '@prisma/client';
import { AppleAuthService } from './apple-auth.service';

describe('AppleAuthService', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const { privateKey: appleClientPrivateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const appleClientPrivateKeyPem = appleClientPrivateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const publicJwk = publicKey.export({ format: 'jwk' });
  const kid = 'apple-test-key';
  const clientId = 'com.eum.app';
  const configValues: Record<string, string> = {
    APPLE_CLIENT_ID: clientId,
    APPLE_TEAM_ID: 'TEAMID1234',
    APPLE_KEY_ID: 'KEYID1234',
    APPLE_PRIVATE_KEY: appleClientPrivateKeyPem,
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '14d',
  };

  const configServiceMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      return configValues[key] ?? defaultValue;
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
    configValues.APPLE_PRIVATE_KEY = appleClientPrivateKeyPem;

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

  it('authorization code가 전달되어도 Apple token endpoint를 호출하지 않는다', async () => {
    const escapedPrivateKey = appleClientPrivateKeyPem.replaceAll('\n', '\\n');
    configValues.APPLE_PRIVATE_KEY = `"${Buffer.from(escapedPrivateKey).toString('base64')}"`;

    await service.loginWithApple({
      identityToken: signIdentityToken(),
      authorizationCode: 'apple-auth-code',
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      'https://appleid.apple.com/auth/token',
      expect.anything(),
    );
  });

  it('authorization code를 Apple 토큰으로 교환한 뒤 revoke endpoint를 호출한다', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => ({
          refresh_token: 'apple-refresh-token',
          access_token: 'apple-access-token',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => '',
      });

    await service.revokeAuthorizationCode('apple-auth-code');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://appleid.apple.com/auth/token',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://appleid.apple.com/auth/revoke',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const fetchCalls = fetchMock.mock.calls as unknown as Array<
      [string, { body?: string }]
    >;
    const revokeBody = fetchCalls[1]?.[1]?.body ?? '';
    expect(revokeBody).toContain('token=apple-refresh-token');
    expect(revokeBody).toContain('token_type_hint=refresh_token');
  });
});
