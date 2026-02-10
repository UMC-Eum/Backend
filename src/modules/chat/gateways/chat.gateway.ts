import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus } from '@prisma/client';

import type { Server, Socket, DefaultEventsMap } from 'socket.io';

import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from '../../auth/services/jwt-token.service';

type SocketData = { userId?: number };

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

type JoinRoomBody = { chatRoomId: number };

type SendMessageBody = {
  chatRoomId: number;
  type: 'AUDIO' | 'PHOTO' | 'VIDEO' | 'TEXT';
  text?: string | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
};

function toPositiveInt(v: unknown): number | null {
  const n =
    typeof v === 'number'
      ? v
      : typeof v === 'string'
        ? Number(v)
        : Array.isArray(v) && typeof v[0] === 'string'
          ? Number(v[0])
          : NaN;

  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function extractBearerToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const query = client.handshake.query as Record<string, unknown> | undefined;

  const raw =
    auth?.token ?? auth?.accessToken ?? query?.token ?? query?.accessToken;

  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: ConfigService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private emitToRooms(rooms: string[], event: string, payload: unknown): void {
    this.server.to(rooms).emit(event, payload);
  }

  emitMessageRead(params: {
    chatRoomId: number;
    messageId: number;
    readerUserId: number;
    readAt: string;
    notifyUserIds?: number[];
  }): void {
    const payload = {
      chatRoomId: params.chatRoomId,
      messageId: params.messageId,
      readerUserId: params.readerUserId,
      readAt: params.readAt,
    };

    const rooms = new Set<string>([`room:${params.chatRoomId}`]);
    for (const userId of params.notifyUserIds ?? []) {
      rooms.add(`user:${userId}`);
    }

    this.emitToRooms([...rooms], 'message.read', payload);
  }

  emitMessageDeleted(params: {
    chatRoomId: number;
    messageId: number;
    deletedByUserId: number;
    deletedAt: string;
    notifyUserIds?: number[];
  }): void {
    const payload = {
      chatRoomId: params.chatRoomId,
      messageId: params.messageId,
      deletedByUserId: params.deletedByUserId,
      deletedAt: params.deletedAt,
    };

    const rooms = new Set<string>([`room:${params.chatRoomId}`]);
    for (const userId of params.notifyUserIds ?? []) {
      rooms.add(`user:${userId}`);
    }

    this.emitToRooms([...rooms], 'message.deleted', payload);
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const bearer = extractBearerToken(client);
      if (!bearer) {
        this.logger.warn('reject connection: missing token');
        client.disconnect(true);
        return;
      }

      const token = bearer.replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        this.logger.warn('reject connection: invalid token format');
        client.disconnect(true);
        return;
      }

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

      if (!userRecord) {
        this.logger.warn('reject connection: user not found');
        client.disconnect(true);
        return;
      }

      const userId = Number(userRecord.id);
      client.data.userId = userId;
      client.join(`user:${userId}`);

      this.logger.log(`connected: socket=${client.id} userId=${userId}`);
    } catch (e) {
      this.logger.warn(`reject connection: ${String(e)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(
      `disconnected: socket=${client.id} userId=${client.data.userId ?? 'N/A'}`,
    );
  }

  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: AuthedSocket) {
    return {
      ok: true,
      userId: client.data.userId ?? null,
      ts: new Date().toISOString(),
    };
  }

  @SubscribeMessage('room.join')
  async onJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinRoomBody,
  ) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new WsException('Invalid chatRoomId');
    }

    const senderUserId = client.data.userId;
    if (!senderUserId) {
      throw new WsException('Unauthorized socket');
    }

    const me = BigInt(senderUserId);
    const roomId = BigInt(chatRoomId);

    const isParticipant = await this.prisma.chatParticipant.findFirst({
      where: {
        userId: me,
        roomId,
        endedAt: null,
      },
    });

    if (!isParticipant) {
      throw new WsException('Not a participant of this room');
    }

    const room = `room:${chatRoomId}`;
    client.join(room);

    return { ok: true, joined: room };
  }

  @SubscribeMessage('message.send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageBody,
  ) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new WsException('Invalid chatRoomId');
    }

    const senderUserId = client.data.userId;
    if (!senderUserId) {
      throw new WsException('Unauthorized socket');
    }

    const type = body?.type;
    if (!type || !['AUDIO', 'PHOTO', 'VIDEO', 'TEXT'].includes(type)) {
      throw new WsException('Invalid message type');
    }

    if (type === 'TEXT') {
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!text) {
        throw new WsException('Message text is required');
      }
    } else {
      const mediaUrl =
        typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      if (!mediaUrl) {
        throw new WsException('Media URL is required');
      }
    }

    const me = BigInt(senderUserId);
    const roomId = BigInt(chatRoomId);

    const isParticipant = await this.prisma.chatParticipant.findFirst({
      where: {
        userId: me,
        roomId,
        endedAt: null,
      },
    });

    if (!isParticipant) {
      throw new WsException('Not a participant of this room');
    }

    const peer = await this.prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: { not: me },
        endedAt: null,
      },
      select: { userId: true },
    });

    if (!peer) {
      throw new WsException('Peer not found');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        sentById: me,
        sentToId: peer.userId,
        sentAt: new Date(),
      },
      select: { id: true, sentAt: true },
    });

    const shouldHaveDuration = type === 'AUDIO' || type === 'VIDEO';

    await this.prisma.chatMedia.create({
      data: {
        messageId: message.id,
        type,
        text: type === 'TEXT' ? (body.text ?? null) : null,
        url: type !== 'TEXT' ? (body.mediaUrl ?? null) : null,
        durationSec: shouldHaveDuration ? (body.durationSec ?? null) : null,
      },
    });

    const room = `room:${chatRoomId}`;
    const payload = {
      messageId: Number(message.id),
      chatRoomId,
      senderUserId,
      type,
      text: type === 'TEXT' ? (body.text ?? null) : null,
      mediaUrl: type !== 'TEXT' ? (body.mediaUrl ?? null) : null,
      durationSec: shouldHaveDuration ? (body.durationSec ?? null) : null,
      sentAt: message.sentAt.toISOString(),
    };

    void this.server.to(room).emit('message.new', payload);

    return { ok: true, messageId: Number(message.id) };
  }
}
