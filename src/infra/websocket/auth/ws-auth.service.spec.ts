import { WsAuthService } from './ws-auth.service';

describe('WsAuthService', () => {
  it('Prisma 조회 오류를 인증 실패로 숨기지 않고 전파한다', async () => {
    const databaseError = new Error('database unavailable');
    const prisma = {
      user: { findFirst: jest.fn().mockRejectedValue(databaseError) },
    };
    const jwtTokenService = {
      verify: jest.fn().mockReturnValue({ sub: '42' }),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    };
    const service = new WsAuthService(
      prisma as never,
      jwtTokenService as never,
      configService as never,
    );
    const client = {
      id: 'socket-1',
      handshake: {
        address: '127.0.0.1',
        auth: { token: 'access-token' },
        query: {},
      },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
    };

    await expect(service.attachUser(client as never)).rejects.toBe(
      databaseError,
    );
  });
});
