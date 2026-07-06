import { InMemoryPresenceStore } from './in-memory-presence.store';

describe('InMemoryPresenceStore', () => {
  let store: InMemoryPresenceStore;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-07T06:00:00.000Z'));
    store = new InMemoryPresenceStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns active users with lastActiveAt', () => {
    store.onConnect(1, 'socket-1');

    expect(store.getActiveUsers()).toEqual([
      {
        userId: 1,
        lastActiveAt: new Date('2026-07-07T06:00:00.000Z'),
      },
    ]);
  });

  it('filters users outside the active window', () => {
    store.onConnect(1, 'socket-1');
    jest.setSystemTime(new Date('2026-07-07T06:03:00.000Z'));

    expect(store.getActiveUsers(2 * 60 * 1000)).toEqual([]);
  });

  it('keeps a user active until all sockets disconnect', () => {
    store.onConnect(1, 'socket-1');
    store.onConnect(1, 'socket-2');
    store.onDisconnect(1, 'socket-1');

    expect(store.getActiveUserIds()).toEqual([1]);

    store.onDisconnect(1, 'socket-2');

    expect(store.getActiveUserIds()).toEqual([]);
  });
});
