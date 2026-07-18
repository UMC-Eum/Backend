export const PRESENCE_STORE = 'PRESENCE_STORE' as const;

export type ActivePresenceUser = {
  userId: number;
  lastActiveAt: Date;
};

export interface PresenceStore {
  onConnect(userId: number, socketId: string): void;
  onDisconnect(userId: number, socketId: string): void;
  touch(userId: number): void;

  getActiveUsers(withinMs?: number): ActivePresenceUser[];
  getActiveUserIds(withinMs?: number): number[];
  getLastSeenAt(userId: number): Date | null;
}
