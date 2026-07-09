import { ChatGateway } from './chat.gateway';

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
