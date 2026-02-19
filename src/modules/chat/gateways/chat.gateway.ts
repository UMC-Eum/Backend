import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  Inject,
  Injectable,
  Logger,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Server, Socket, DefaultEventsMap } from 'socket.io';

import { WsExceptionFilter } from '../../../common/filters/ws-exception.filter';
import { WsAuthService } from '../../../infra/websocket/auth/ws-auth.service';
import { WsUserGuard } from '../../../infra/websocket/guards/ws-user.guard';
import {
  PRESENCE_STORE,
  type PresenceStore,
} from '../../../infra/websocket/presence/presence.token';
import {
  toChatRoom,
  toUserRoom,
} from '../../../infra/websocket/utils/ws-rooms.util';

import {
  ChatSocketService,
  type JoinRoomBody,
  type SendMessageBody,
} from '../services/socket/chat-socket.service';

type SocketData = { userId?: number };

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: true, credentials: true },
})
@UseFilters(new WsExceptionFilter())
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly wsAuthService: WsAuthService,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
    private readonly chatSocketService: ChatSocketService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private emitToRooms(rooms: string[], event: string, payload: unknown): void {
    if (!this.server) return;
    const uniqueRooms = [...new Set(rooms)];
    this.server.to(uniqueRooms).emit(event, payload);
  }

  // REST(읽음/삭제)에서 호출
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

    const rooms = new Set<string>([toChatRoom(params.chatRoomId)]);
    for (const userId of params.notifyUserIds ?? []) {
      rooms.add(toUserRoom(userId));
    }

    this.emitToRooms([...rooms], 'message.read', payload);
  }

  // REST(읽음/삭제)에서 호출
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

    const rooms = new Set<string>([toChatRoom(params.chatRoomId)]);
    for (const userId of params.notifyUserIds ?? []) {
      rooms.add(toUserRoom(userId));
    }

    this.emitToRooms([...rooms], 'message.deleted', payload);
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const userId = await this.wsAuthService.attachUser(client);
      if (!userId) {
        this.logger.warn('reject connection: auth failed');
        client.disconnect(true);
        return;
      }

      this.presenceStore.onConnect(userId, client.id);

      this.logger.log(`connected: socket=${client.id} userId=${userId}`);
    } catch (e) {
      this.logger.warn(`reject connection: ${String(e)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const userId = client.data.userId;

    if (typeof userId === 'number') {
      this.presenceStore.onDisconnect(userId, client.id);
    }

    this.logger.log(
      `disconnected: socket=${client.id} userId=${client.data.userId ?? 'N/A'}`,
    );
  }

  @UseGuards(WsUserGuard)
  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: AuthedSocket) {
    const userId = client.data.userId as number;
    this.presenceStore.touch(userId);

    return {
      ok: true,
      userId,
      ts: new Date().toISOString(),
    };
  }

  @UseGuards(WsUserGuard)
  @SubscribeMessage('room.join')
  async onJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinRoomBody,
  ) {
    const userId = client.data.userId as number;
    this.presenceStore.touch(userId);

    const chatRoomId = await this.chatSocketService.joinRoom(userId, body);

    const room = toChatRoom(chatRoomId);
    client.join(room);

    return { ok: true, joined: room };
  }

  @UseGuards(WsUserGuard)
  @SubscribeMessage('message.send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageBody,
  ) {
    const userId = client.data.userId as number;
    this.presenceStore.touch(userId);

    return this.chatSocketService.sendMessage(this.server, userId, body);
  }
}
