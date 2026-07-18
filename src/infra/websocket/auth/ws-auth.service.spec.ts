import { ActiveStatus } from '@prisma/client';

import { WsAuthService } from './ws-auth.service';

describe('WsAuthService.attachUser', () => {
  const buildService = () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };
    const jwtTokenService = {
      verify: jest.fn(),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('access-secret'),
    };
    const service = new WsAuthService(
      prisma as never,
      jwtTokenService as never,
      configService as never,
    );

    return { service, prisma, jwtTokenService, configService };
  };

  const makeClient = (auth: Record<string, unknown> = {}) => ({
    id: 'socket-1',
    data: {} as { userId?: number },
    handshake: {
      auth,
      query: {},
      address: '127.0.0.1',
    },
    join: jest.fn().mockResolvedValue(undefined),
  });

  it('토큰이 없으면 인증하지 않는다', async () => {
    const { service, prisma, jwtTokenService } = buildService();
    const client = makeClient();

    await expect(service.attachUser(client as never)).resolves.toBeNull();

    expect(jwtTokenService.verify).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('JWT 검증에 실패하면 인증하지 않는다', async () => {
    const { service, prisma, jwtTokenService } = buildService();
    const client = makeClient({ token: 'invalid-token' });
    jwtTokenService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await expect(service.attachUser(client as never)).resolves.toBeNull();

    expect(jwtTokenService.verify).toHaveBeenCalledWith(
      'invalid-token',
      'access-secret',
    );
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('활성 사용자를 찾지 못하면 인증하지 않는다', async () => {
    const { service, prisma, jwtTokenService } = buildService();
    const client = makeClient({ accessToken: 'valid-token' });
    jwtTokenService.verify.mockReturnValue({ sub: '42' });
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.attachUser(client as never)).resolves.toBeNull();

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 42n,
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: { id: true },
    });
  });

  it('인증 성공 시 userId를 저장하고 사용자 room에 참여시킨다', async () => {
    const { service, prisma, jwtTokenService } = buildService();
    const client = makeClient({ token: 'Bearer valid-token' });
    jwtTokenService.verify.mockReturnValue({ sub: 42 });
    prisma.user.findFirst.mockResolvedValue({ id: 42n });

    await expect(service.attachUser(client as never)).resolves.toBe(42);

    expect(jwtTokenService.verify).toHaveBeenCalledWith(
      'valid-token',
      'access-secret',
    );
    expect(client.data.userId).toBe(42);
    expect(client.join).toHaveBeenCalledWith('user:42');
  });

  it('Prisma 조회 오류를 인증 실패로 숨기지 않고 전파한다', async () => {
    const { service, prisma, jwtTokenService } = buildService();
    const client = makeClient({ token: 'valid-token' });
    const databaseError = new Error('database unavailable');
    jwtTokenService.verify.mockReturnValue({ sub: '42' });
    prisma.user.findFirst.mockRejectedValue(databaseError);

    await expect(service.attachUser(client as never)).rejects.toBe(
      databaseError,
    );
  });
});
