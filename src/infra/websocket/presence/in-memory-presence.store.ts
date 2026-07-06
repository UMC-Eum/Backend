import { Injectable } from '@nestjs/common';
import type { ActivePresenceUser, PresenceStore } from './presence.token';

type PresenceEntry = {
  socketIds: Set<string>;
  lastSeenAtMs: number;
};

@Injectable()
export class InMemoryPresenceStore implements PresenceStore {
  private readonly presenceByUserId = new Map<number, PresenceEntry>();

  onConnect(userId: number, socketId: string): void {
    const now = Date.now();
    const existing = this.presenceByUserId.get(userId);

    if (existing) {
      existing.socketIds.add(socketId);
      existing.lastSeenAtMs = now;
      return;
    }

    this.presenceByUserId.set(userId, {
      socketIds: new Set([socketId]),
      lastSeenAtMs: now,
    });
  }

  onDisconnect(userId: number, socketId: string): void {
    const existing = this.presenceByUserId.get(userId);
    if (!existing) return;

    existing.socketIds.delete(socketId);

    if (existing.socketIds.size === 0) {
      this.presenceByUserId.delete(userId);
    }
  }

  touch(userId: number): void {
    const existing = this.presenceByUserId.get(userId);
    if (!existing) return;

    existing.lastSeenAtMs = Date.now();
  }

  getActiveUsers(withinMs?: number): ActivePresenceUser[] {
    const now = Date.now();
    const users: ActivePresenceUser[] = [];

    for (const [userId, entry] of this.presenceByUserId.entries()) {
      if (withinMs && now - entry.lastSeenAtMs > withinMs) continue;
      if (entry.socketIds.size === 0) continue;
      users.push({ userId, lastActiveAt: new Date(entry.lastSeenAtMs) });
    }

    return users;
  }

  getActiveUserIds(withinMs?: number): number[] {
    return this.getActiveUsers(withinMs).map((user) => user.userId);
  }

  getLastSeenAt(userId: number): Date | null {
    const entry = this.presenceByUserId.get(userId);
    if (!entry) return null;

    return new Date(entry.lastSeenAtMs);
  }
}
