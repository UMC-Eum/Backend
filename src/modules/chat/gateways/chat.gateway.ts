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

import type { Server, Socket, DefaultEventsMap } from 'socket.io';

import { PrismaService } from '../../../infra/prisma/prisma.service';

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

function extractUserId(client: Socket): number | null {
  // socket.io 타입 상 auth/query가 any로 나오는 케이스가 있어 unknown으로 처리
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const query = client.handshake.query as Record<string, unknown> | undefined;

  const raw = auth?.userId ?? query?.userId;
  return toPositiveInt(raw);
}

@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: AuthedSocket) {
    const userId = extractUserId(client);

    if (!userId) {
      this.logger.warn(`reject connection: invalid userId`);
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    client.join(`user:${userId}`);

    this.logger.log(`connected: socket=${client.id} userId=${userId}`);
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
  onJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinRoomBody,
  ) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new WsException('Invalid chatRoomId');
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

    await this.prisma.chatMedia.create({
      data: {
        messageId: message.id,
        type,
        text: type === 'TEXT' ? (body.text ?? null) : null,
        url: type !== 'TEXT' ? (body.mediaUrl ?? null) : null,
      },
    });

    const room = `room:${chatRoomId}`;
    const payload = {
      messageId: Number(message.id),
      chatRoomId,
      senderUserId,
      type,
      text: type === 'TEXT' ? body.text : null,
      mediaUrl: type !== 'TEXT' ? body.mediaUrl : null,
      durationSec: type === 'AUDIO' ? (body.durationSec ?? null) : null,
      sentAt: message.sentAt.toISOString(),
    };

    this.server.to(room).emit('message.new', payload);
    return { ok: true, messageId: Number(message.id) };
  }
}
