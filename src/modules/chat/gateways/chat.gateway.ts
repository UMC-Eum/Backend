import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActiveStatus, ChatMediaType, NotificationType } from '@prisma/client';
import type { Server, Socket, DefaultEventsMap } from 'socket.io';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtTokenService } from '../../auth/services/jwt-token.service';
import { ChatMediaService } from '../services/chat-media/chat-media.service';
import { NotificationService } from '../../notification/services/notification.service';
import { buildMessagePreview } from '../utils/message-preview.util';
import { AppException } from '../../../common/errors/app.exception';
import { WsExceptionFilter } from '../../../common/filters/ws-exception.filter';

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
  type: ChatMediaType;
  text?: string | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
};

function isChatMediaType(v: unknown): v is ChatMediaType {
  return (
    typeof v === 'string' &&
    (Object.values(ChatMediaType) as string[]).includes(v)
  );
}

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

function shorten(input: string, maxLen = 140): string {
  const s = input.trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
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
@UseFilters(new WsExceptionFilter())
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: ConfigService,
    private readonly chatMediaService: ChatMediaService,
    private readonly notificationService: NotificationService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private emitToRooms(rooms: string[], event: string, payload: unknown): void {
    if (!this.server) return;
    const uniqueRooms = [...new Set(rooms)];
    this.server.to(uniqueRooms).emit(event, payload);
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

  private async notifyNewMessage(params: {
    receiverUserId: number;
    senderUserId: number;
    chatRoomId: number;
    messageId: number;
    messageType: SendMessageBody['type'];
    text: string | null;
  }): Promise<void> {
    try {
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

      const created = await this.notificationService.createNotification(
        params.receiverUserId,
        NotificationType.CHAT,
        title,
        preview.textPreview,
      );

      this.server.to(`user:${params.receiverUserId}`).emit('notification.new', {
        notificationId: created.id.toString(),
        type: created.type,
        title: created.title,
        body: created.body,
        isRead: created.isRead,
        createdAt: created.createdAt.toISOString(),
        data: {
          chatRoomId: params.chatRoomId,
          messageId: params.messageId,
          senderUserId: params.senderUserId,
        },
      });
    } catch (e) {
      this.logger.warn(`notifyNewMessage failed: ${String(e)}`);
    }
  }

  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: AuthedSocket) {
    return {
      ok: true,
      userId: client.data.userId ?? null,
      ts: new Date().toISOString(),
    };
  }

  // 입장은 허용
  @SubscribeMessage('room.join')
  async onJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinRoomBody,
  ) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'chatRoomId가 올바르지 않습니다.',
      });
    }

    const senderUserId = client.data.userId;
    if (!senderUserId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
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
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const room = `room:${chatRoomId}`;
    client.join(room);

    return { ok: true, joined: room };
  }

  // 전송은 차단 체크
  @SubscribeMessage('message.send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageBody,
  ) {
    const chatRoomId = toPositiveInt(body?.chatRoomId);
    if (!chatRoomId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'chatRoomId가 올바르지 않습니다.',
      });
    }

    const senderUserId = client.data.userId;
    if (!senderUserId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    this.logger.debug(
      `message.send recv room=${chatRoomId} user=${senderUserId} type=${String(body?.type)}`,
    );

    const type = body?.type;
    if (!isChatMediaType(type)) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '메시지 타입이 올바르지 않습니다.',
      });
    }

    if (type === 'TEXT') {
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!text) {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: '텍스트 메시지는 내용이 필요합니다.',
        });
      }
    } else {
      const mediaUrl =
        typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      if (!mediaUrl) {
        throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
          message: '미디어 메시지는 mediaUrl이 필요합니다.',
        });
      }

      if (type === 'AUDIO' || type === 'VIDEO') {
        const durationSec = toPositiveInt(body?.durationSec);
        if (!durationSec) {
          throw new AppException('VALIDATION_REQUIRED_FIELD_MISSING', {
            message: '오디오/비디오 메시지는 durationSec이 필요합니다.',
          });
        }
      }

      this.logger.debug(
        `message.send media room=${chatRoomId} user=${senderUserId} type=${type} mediaUrl=${shorten(mediaUrl)} durationSec=${String(body?.durationSec)}`,
      );
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
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
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
      throw new AppException('CHAT_ROOM_ACCESS_FAILED');
    }

    const isBlocked = await this.isBlockedBetweenUsers(me, peer.userId);
    if (isBlocked) {
      throw new AppException('CHAT_MESSAGE_BLOCKED');
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

    this.logger.debug(
      `message.send created messageId=${Number(message.id)} room=${chatRoomId}`,
    );

    const storedMediaRef =
      type !== 'TEXT' && typeof body.mediaUrl === 'string'
        ? this.chatMediaService.normalizeChatMediaRef(chatRoomId, body.mediaUrl)
        : null;

    if (storedMediaRef) {
      this.logger.debug(
        `message.send normalized mediaRef=${shorten(storedMediaRef)}`,
      );
    }

    await this.prisma.chatMedia.create({
      data: {
        messageId: message.id,
        type,
        text: type === 'TEXT' ? (body.text ?? null) : null,
        url: type !== 'TEXT' ? storedMediaRef : null,
        durationSec:
          type === 'AUDIO' || type === 'VIDEO'
            ? (toPositiveInt(body.durationSec) ?? null)
            : null,
      },
    });

    const clientMediaUrl =
      await this.chatMediaService.toClientUrl(storedMediaRef);

    const room = `room:${chatRoomId}`;
    const payload = {
      messageId: Number(message.id),
      chatRoomId,
      senderUserId,
      type,
      text: type === 'TEXT' ? (body.text ?? null) : null,
      mediaUrl: type !== 'TEXT' ? clientMediaUrl : null,
      durationSec:
        type === 'AUDIO' || type === 'VIDEO'
          ? (toPositiveInt(body.durationSec) ?? null)
          : null,
      sentAt: message.sentAt.toISOString(),
    };

    this.server.to(room).emit('message.new', payload);

    void this.notifyNewMessage({
      receiverUserId: Number(peer.userId),
      senderUserId,
      chatRoomId,
      messageId: Number(message.id),
      messageType: type,
      text: type === 'TEXT' ? (body.text ?? null) : null,
    });

    return { ok: true, messageId: Number(message.id) };
  }

  private async isBlockedBetweenUsers(a: bigint, b: bigint): Promise<boolean> {
    const found = await this.prisma.block.findFirst({
      where: {
        deletedAt: null,
        status: 'BLOCKED',
        OR: [
          { blockedById: a, blockedId: b },
          { blockedById: b, blockedId: a },
        ],
      },
      select: { id: true },
    });

    return found !== null;
  }
}
