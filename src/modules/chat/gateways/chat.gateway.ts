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
import { UserActivityService } from '../../user/services/user/user-activity.service';

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
    private readonly userActivityService: UserActivityService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private emitToRooms(rooms: string[], event: string, payload: unknown): void {
    if (!this.server) return;
    const uniqueRooms = [...new Set(rooms)];
    this.server.to(uniqueRooms).emit(event, payload);
  }

  // 클럽 탈퇴/강퇴 시 해당 유저의 소켓을 채팅 룸에서 퇴출한다.
  // 룸 join은 입장 시점에만 인가하므로, 이미 join된 소켓은 명시적으로 빼주지 않으면
  // message.new broadcast를 계속 수신한다. disconnect가 아니라 해당 룸에서만 leave해
  // DIRECT/다른 클럽 룸 참여는 유지한다.
  // NOTE(scale-out): 기본 인메모리 어댑터에서 fetchSockets/leave는 로컬 노드 소켓만 처리한다.
  //   다중 인스턴스 배포 시 @socket.io/redis-adapter 도입 필요(코드 shape는 그대로 동작).
  async evictUserFromRoom(chatRoomId: number, userId: number): Promise<void> {
    if (!this.server) return;
    const room = toChatRoom(chatRoomId);
    const sockets = await this.server.in(room).fetchSockets();
    for (const s of sockets) {
      const socketUserId = (s.data as SocketData)?.userId;
      if (Number(socketUserId) === userId) {
        void s.leave(room);
        s.emit('room.evicted', { chatRoomId });
      }
    }
  }

  // REST(입장/퇴장 SYSTEM 메시지 등)에서 호출 — 방 전체에 message.new broadcast.
  emitChatMessage(chatRoomId: number, payload: unknown): void {
    this.emitToRooms([toChatRoom(chatRoomId)], 'message.new', payload);
  }

  // REST(읽음)에서 호출 — 방 단위 읽음 커서 broadcast.
  // 클라는 readerUserId의 커서를 lastReadAt으로 갱신하고 sentAt <= lastReadAt 메시지를 읽음 처리한다.
  emitRoomRead(params: {
    chatRoomId: number;
    readerUserId: number;
    lastReadAt: string;
    notifyUserIds?: number[];
  }): void {
    const payload = {
      chatRoomId: params.chatRoomId,
      readerUserId: params.readerUserId,
      lastReadAt: params.lastReadAt,
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
      void this.recordUserActivity(userId);

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
      if (this.presenceStore.getLastSeenAt(userId) === null) {
        this.userActivityService.clearActivityThrottle(userId);
      }
    }

    this.logger.log(
      `disconnected: socket=${client.id} userId=${client.data.userId ?? 'N/A'}`,
    );
  }

  @UseGuards(WsUserGuard)
  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: AuthedSocket) {
    // TODO(active-users): 클라이언트는 앱 foreground 동안 이 ping을 주기적으로 보내야 한다.
    // foreground/background heartbeat 정책과 ping 주기는 프론트/앱 레포에서 관리한다.
    const userId = client.data.userId as number;
    this.presenceStore.touch(userId);
    void this.recordUserActivity(userId);

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
    void this.recordUserActivity(userId);

    const chatRoomId = await this.chatSocketService.joinRoom(userId, body);

    const room = toChatRoom(chatRoomId);
    await client.join(room);

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
    void this.recordUserActivity(userId);

    return this.chatSocketService.sendMessage(this.server, userId, body);
  }

  private async recordUserActivity(userId: number): Promise<void> {
    try {
      await this.userActivityService.recordActivity(userId);
    } catch (e) {
      this.logger.warn(
        `record user activity failed userId=${userId}: ${String(e)}`,
      );
    }
  }
}
