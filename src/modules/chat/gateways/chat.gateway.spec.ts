import { ChatGateway } from './chat.gateway';

describe('ChatGateway connection authentication', () => {
  type Middleware = (
    client: unknown,
    next: (error?: Error & { data?: { code?: string } }) => void,
  ) => Promise<void>;

  const buildGateway = () => {
    const wsAuthService = { attachUser: jest.fn() };
    const presenceStore = {
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      getLastSeenAt: jest.fn(),
      touch: jest.fn(),
    };
    const userActivityService = {
      recordActivity: jest.fn().mockResolvedValue(undefined),
      clearActivityThrottle: jest.fn(),
    };
    const gateway = new ChatGateway(
      wsAuthService as never,
      presenceStore as never,
      null as never,
      userActivityService as never,
    );
    let middleware: Middleware | undefined;
    const use = jest.fn((registered: Middleware) => {
      middleware = registered;
    });

    gateway.afterInit({ use } as never);

    if (!middleware) {
      throw new Error('Socket.IO middleware was not registered');
    }

    return {
      gateway,
      middleware,
      wsAuthService,
      presenceStore,
      userActivityService,
    };
  };

  const makeClient = () => ({
    id: 'socket-1',
    data: {} as { userId?: number },
    disconnect: jest.fn(),
  });

  it('미인증 namespace 연결을 AUTH-001로 거부한다', async () => {
    const { middleware, wsAuthService } = buildGateway();
    const client = makeClient();
    const next = jest.fn();
    wsAuthService.attachUser.mockResolvedValue(null);

    await middleware(client, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH-001' } }),
    );
  });

  it('인증 처리 중 서버 오류를 SYS-001로 거부한다', async () => {
    const { middleware, wsAuthService } = buildGateway();
    const client = makeClient();
    const next = jest.fn();
    wsAuthService.attachUser.mockRejectedValue(
      new Error('database unavailable'),
    );

    await middleware(client, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'SYS-001' } }),
    );
  });

  it('인증 성공 시 연결을 허용한다', async () => {
    const { middleware, wsAuthService } = buildGateway();
    const client = makeClient();
    const next = jest.fn();
    wsAuthService.attachUser.mockImplementation(() => {
      client.data.userId = 42;
      return Promise.resolve(42);
    });

    await middleware(client, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('인증된 연결의 presence를 등록하며 인증을 반복하지 않는다', () => {
    const { gateway, wsAuthService, presenceStore } = buildGateway();
    const client = makeClient();
    client.data.userId = 42;

    gateway.handleConnection(client as never);

    expect(presenceStore.onConnect).toHaveBeenCalledWith(42, 'socket-1');
    expect(wsAuthService.attachUser).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});

describe('ChatGateway.evictUserFromRoom', () => {
  const makeSocket = (userId: number) => ({
    data: { userId },
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  });

  const buildGateway = (sockets: ReturnType<typeof makeSocket>[]) => {
    const fetchSockets = jest.fn().mockResolvedValue(sockets);
    const inFn = jest.fn().mockReturnValue({ fetchSockets });
    const gateway = new ChatGateway(
      null as never,
      null as never,
      null as never,
      null as never,
    );
    (gateway as unknown as { server: unknown }).server = { in: inFn };
    return { gateway, inFn, fetchSockets };
  };

  it('대상 userId의 소켓만 룸에서 leave시키고 room.evicted를 통지한다', async () => {
    const target = makeSocket(42);
    const other = makeSocket(99);
    const { gateway, inFn } = buildGateway([target, other]);

    await gateway.evictUserFromRoom(7, 42);

    expect(inFn).toHaveBeenCalledWith('room:7');
    expect(target.leave).toHaveBeenCalledWith('room:7');
    expect(target.emit).toHaveBeenCalledWith('room.evicted', { chatRoomId: 7 });
    expect(other.leave).not.toHaveBeenCalled();
    expect(other.emit).not.toHaveBeenCalled();
  });

  it('server가 없으면 아무 것도 하지 않는다', async () => {
    const gateway = new ChatGateway(
      null as never,
      null as never,
      null as never,
      null as never,
    );
    await expect(gateway.evictUserFromRoom(7, 42)).resolves.toBeUndefined();
  });
});
