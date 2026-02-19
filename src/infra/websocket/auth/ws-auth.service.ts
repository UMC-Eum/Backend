import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus } from '@prisma/client';
import type { DefaultEventsMap, Socket } from 'socket.io';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtTokenService } from '../../../modules/auth/services/jwt-token.service';
import { toUserRoom } from '../utils/ws-rooms.util';

type SocketData = { userId?: number };

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

function extractBearerToken(client: AuthedSocket): string | null {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const query = client.handshake.query as Record<string, unknown> | undefined;

  const raw =
    auth?.token ?? auth?.accessToken ?? query?.token ?? query?.accessToken;

  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

function toErrorInfo(e: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack };
  }
  return { name: 'UnknownError', message: String(e) };
}

function toPositiveBigInt(v: unknown): bigint | null {
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v <= 0) return null;
    return BigInt(Math.floor(v));
  }

  if (typeof v === 'string') {
    const s = v.trim();
    if (!/^\d+$/.test(s)) return null;

    try {
      const n = BigInt(s);
      if (n <= 0n) return null;
      return n;
    } catch {
      return null;
    }
  }

  return null;
}

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: ConfigService,
  ) {}

  async attachUser(client: AuthedSocket): Promise<number | null> {
    const socketId = client.id;
    const ip = client.handshake.address;

    const bearer = extractBearerToken(client);
    if (!bearer) {
      this.logger.debug(
        `attachUser auth failed: missing token socket=${socketId} ip=${ip}`,
      );
      return null;
    }

    const token = bearer.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      this.logger.debug(
        `attachUser auth failed: empty token socket=${socketId} ip=${ip}`,
      );
      return null;
    }

    const secret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret',
    );

    let subId: bigint | null = null;

    try {
      const payload = this.jwtTokenService.verify(token, secret) as unknown;
      const sub = (payload as { sub?: unknown }).sub;

      subId = toPositiveBigInt(sub);
      if (!subId) {
        this.logger.warn(
          `attachUser auth failed: invalid sub socket=${socketId} ip=${ip}`,
        );
        return null;
      }
    } catch (e) {
      const info = toErrorInfo(e);
      // 토큰 원문은 절대 로그에 남기지 않음
      this.logger.warn(
        `attachUser auth failed: jwt verify error socket=${socketId} ip=${ip} err=${info.name}:${info.message}`,
      );
      return null;
    }

    try {
      const userRecord = await this.prisma.user.findFirst({
        where: {
          id: subId,
          deletedAt: null,
          status: ActiveStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!userRecord) {
        this.logger.debug(
          `attachUser auth failed: user not found socket=${socketId} ip=${ip} sub=${subId.toString()}`,
        );
        return null;
      }

      const userId = Number(userRecord.id);

      client.data.userId = userId;
      client.join(toUserRoom(userId));

      return userId;
    } catch (e) {
      const info = toErrorInfo(e);
      this.logger.error(
        `attachUser error: prisma query failed socket=${socketId} ip=${ip} sub=${subId.toString()} err=${info.name}:${info.message}`,
        info.stack,
      );
      return null;
    }
  }
}
