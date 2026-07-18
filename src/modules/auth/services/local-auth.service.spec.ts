import { scryptSync } from 'crypto';
import { ActiveStatus } from '@prisma/client';
import { LocalAuthService } from './local-auth.service';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtTokenService } from './jwt-token.service';

function createPasswordHash(password: string) {
  const salt = Buffer.from('test-salt');
  const hash = scryptSync(password, salt, 64);

  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

describe('LocalAuthService', () => {
  const configValues = {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '14d',
  };
  const configServiceMock = {
    get: jest.fn((key: keyof typeof configValues) => configValues[key]),
    getOrThrow: jest.fn((key: keyof typeof configValues) => configValues[key]),
  };
  const jwtTokenServiceMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const authRepositoryMock = {
    findLocalAuthAccountByUsername: jest.fn(),
    rotateRefreshToken: jest.fn(),
  };
  let service: LocalAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtTokenServiceMock.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    jwtTokenServiceMock.verify.mockReturnValue({
      sub: 1,
      provider: 'local',
      exp: 1_800_000_000,
      iat: 1_700_000_000,
    });
    authRepositoryMock.rotateRefreshToken.mockResolvedValue({
      created: true,
      revokedCount: 0,
    });
    service = new LocalAuthService(
      configServiceMock as never,
      jwtTokenServiceMock as unknown as JwtTokenService,
      authRepositoryMock as unknown as AuthRepository,
    );
  });

  it('로컬 계정으로 로그인하고 토큰을 발급한다', async () => {
    authRepositoryMock.findLocalAuthAccountByUsername.mockResolvedValue({
      id: 1n,
      passwordHash: createPasswordHash('password123'),
      isActive: true,
      user: {
        id: 7n,
        nickname: '관리자',
        status: ActiveStatus.ACTIVE,
        deletedAt: null,
      },
    });

    const result = await service.login({
      username: ' admin01 ',
      password: 'password123',
    });

    expect(
      authRepositoryMock.findLocalAuthAccountByUsername,
    ).toHaveBeenCalledWith('admin01');
    expect(jwtTokenServiceMock.sign).toHaveBeenCalledWith(
      { sub: 7, provider: 'local' },
      'test-access-secret',
      '1h',
    );
    expect(authRepositoryMock.rotateRefreshToken).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isNewUser: false,
      onboardingRequired: false,
      user: {
        userId: 7,
        nickname: '관리자',
      },
    });
  });

  it('비밀번호가 일치하지 않으면 로그인할 수 없다', async () => {
    authRepositoryMock.findLocalAuthAccountByUsername.mockResolvedValue({
      id: 1n,
      passwordHash: createPasswordHash('password123'),
      isActive: true,
      user: {
        id: 7n,
        nickname: '관리자',
        status: ActiveStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await expect(
      service.login({ username: 'admin01', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      internalCode: 'AUTH_LOGIN_REQUIRED',
    });
    expect(jwtTokenServiceMock.sign).not.toHaveBeenCalled();
  });

  it('연결된 유저가 비활성 상태면 로그인할 수 없다', async () => {
    authRepositoryMock.findLocalAuthAccountByUsername.mockResolvedValue({
      id: 1n,
      passwordHash: createPasswordHash('password123'),
      isActive: true,
      user: {
        id: 7n,
        nickname: '관리자',
        status: ActiveStatus.INACTIVE,
        deletedAt: null,
      },
    });

    await expect(
      service.login({ username: 'admin01', password: 'password123' }),
    ).rejects.toMatchObject({
      internalCode: 'AUTH_USER_BLOCKED',
    });
    expect(jwtTokenServiceMock.sign).not.toHaveBeenCalled();
  });
});
