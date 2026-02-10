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
import { ActiveStatus, NotificationType } from '@prisma/client';
import type { Server, Socket, DefaultEventsMap } from 'socket.io';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from '../../auth/services/jwt-token.service';
import { NotificationService } from '../../notification/services/notification.service';
import { buildMessagePreview } from '../utils/message-preview.util';

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
    private readonly notificationService: NotificationService,
  ) {}

  @WebSocketServer()
  server!: Server;

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

  private toIso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return new Date().toISOString();
  }

  private async notifyNewMessage(params: {
    receiverUserId: number;
    senderUserId: number;
    chatRoomId: number;
    messageId: number;
    messageType: SendMessageBody['type'];
    text: string | null;
  }): Promise<void> {
    const sender = await this.prisma.user.findFirst({
      where: {
        id: BigInt(params.senderUserId),
        deletedAt: null,
        status: ActiveStatus.ACTIVE,
      },
      select: { nickname: true },
    });

    const title = sender?.nickname ?? '새 메시지';
    const preview = buildMessagePreview(params.messageType, params.text);

    let created: unknown = null;

    try {
      // DB 알림 생성 (notification 모듈 고정이라 반환 타입은 가정 안 함)
      created = await this.notificationService.createNotification(
        params.receiverUserId,
        NotificationType.CHAT,
        title,
        preview.textPreview,
      );
    } catch (e) {
      // DB 생성이 실패해도 실시간 emit은(가능하면) 시도
      this.logger.warn(`createNotification failed: ${String(e)}`);
    }

    const createdObj =
      created && typeof created === 'object'
        ? (created as Record<string, unknown>)
        : null;

    const notificationId =
      createdObj && 'id' in createdObj ? String(createdObj.id) : null;

    const createdAt =
      createdObj && 'createdAt' in createdObj
        ? this.toIso(createdObj.createdAt)
        : new Date().toISOString();

    // 수신자 개인 룸으로 실시간 알림 전송
    this.server.to(`user:${params.receiverUserId}`).emit('notification.new', {
      notificationId,
      type: NotificationType.CHAT,
      title,
      body: preview.textPreview,
      isRead: false,
      createdAt,
      data: {
        chatRoomId: params.chatRoomId,
        messageId: params.messageId,
        senderUserId: params.senderUserId,
      },
    });
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

    // 채팅방 참여 여부 확인
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

    // AUDIO, VIDEO 둘 다 durationSec 저장
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
      text: type === 'TEXT' ? body.text : null,
      mediaUrl: type !== 'TEXT' ? body.mediaUrl : null,
      durationSec: shouldHaveDuration ? (body.durationSec ?? null) : null,
      sentAt: message.sentAt.toISOString(),
    };

    void this.server.to(room).emit('message.new', payload);
    return { ok: true, messageId: Number(message.id) };
  }
}
