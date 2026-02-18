import { Injectable } from '@nestjs/common';
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

@Injectable()
export class WsAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: ConfigService,
  ) {}

  async attachUser(client: AuthedSocket): Promise<number | null> {
    try {
      const bearer = extractBearerToken(client);
      if (!bearer) return null;

      const token = bearer.replace(/^Bearer\s+/i, '').trim();
      if (!token) return null;

      const secret = this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'dev-access-secret',
      );

      const payload = this.jwtTokenService.verify(token, secret);

      const userRecord = await this.prisma.user.findFirst({
        where: {
          id: BigInt(payload.sub),
          deletedAt: null,
          status: ActiveStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!userRecord) return null;

      const userId = Number(userRecord.id);

      client.data.userId = userId;
      client.join(toUserRoom(userId));

      return userId;
    } catch {
      return null;
    }
  }
}
