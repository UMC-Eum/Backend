export const PRESENCE_STORE = 'PRESENCE_STORE' as const;

export interface PresenceStore {
  onConnect(userId: number, socketId: string): void;
  onDisconnect(userId: number, socketId: string): void;
  touch(userId: number): void;

  getActiveUserIds(withinMs?: number): number[];
  getLastSeenAt(userId: number): Date | null;
}
