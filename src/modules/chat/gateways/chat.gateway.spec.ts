import { ChatGateway } from './chat.gateway';

describe('ChatGateway handshake authentication', () => {
  type ConnectError = Error & { data?: { code?: string } };
  type Middleware = (
    client: { id: string; data: { userId?: number } },
    next: (error?: ConnectError) => void,
  ) => void;

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
    const use = jest.fn((registeredMiddleware: Middleware) => {
      middleware = registeredMiddleware;
    });

    gateway.afterInit({ use } as never);

    if (!middleware) {
      throw new Error('handshake middleware was not registered');
    }

    return {
      gateway,
      wsAuthService,
      presenceStore,
      userActivityService,
      middleware,
      use,
    };
  };

  const runMiddleware = (
    middleware: Middleware,
    client: Parameters<Middleware>[0],
  ) =>
    new Promise<ConnectError | undefined>((resolve) => {
      middleware(client, resolve);
    });

  it('네임스페이스 초기화 시 인증 미들웨어를 등록한다', () => {
    const { use } = buildGateway();

    expect(use).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith(expect.any(Function));
  });

  it('인증 성공 시 연결을 허용하고 handleConnection에서 presence를 등록한다', async () => {
    const { gateway, wsAuthService, presenceStore, middleware } =
      buildGateway();
    const client = { id: 'socket-1', data: { userId: 42 } };
    wsAuthService.attachUser.mockResolvedValue(42);

    await expect(runMiddleware(middleware, client)).resolves.toBeUndefined();
    gateway.handleConnection(client as never);

    expect(wsAuthService.attachUser).toHaveBeenCalledWith(client);
    expect(wsAuthService.attachUser).toHaveBeenCalledTimes(1);
    expect(presenceStore.onConnect).toHaveBeenCalledWith(42, 'socket-1');
  });

  it('인증 실패 시 AUTH-001 connect_error로 연결을 거부한다', async () => {
    const { wsAuthService, presenceStore, middleware } = buildGateway();
    const client = { id: 'socket-1', data: {} };
    wsAuthService.attachUser.mockResolvedValue(null);

    const error = await runMiddleware(middleware, client);

    expect(error).toMatchObject({
      message: '로그인이 필요한 서비스입니다. 로그인 후 이용해주세요.',
      data: { code: 'AUTH-001' },
    });
    expect(presenceStore.onConnect).not.toHaveBeenCalled();
  });

  it('인증 서비스가 예외를 던지면 SYS-001로 연결을 거부한다', async () => {
    const { wsAuthService, middleware } = buildGateway();
    const client = { id: 'socket-1', data: {} };
    wsAuthService.attachUser.mockRejectedValue(new Error('database failed'));

    const error = await runMiddleware(middleware, client);

    expect(error).toMatchObject({
      message: '잠시 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
      data: { code: 'SYS-001' },
    });
    expect(error?.message).not.toContain('database failed');
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
