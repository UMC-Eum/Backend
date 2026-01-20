import { io, type Socket } from 'socket.io-client';

type PingRes = { ok: boolean; userId: number | null; ts: string };
type JoinRes = { ok: boolean; joined: string };
type SendRes = { ok: boolean };

type MessageNew = {
  chatRoomId: number;
  senderUserId: number;
  text: string;
  sentAt: string;
};

interface ServerToClientEvents {
  'message.new': (msg: MessageNew) => void;
}

interface ClientToServerEvents {
  ping: (cb: (res: PingRes) => void) => void;
  'room.join': (
    body: { chatRoomId: number },
    cb: (res: JoinRes) => void,
  ) => void;
  'message.send': (
    body: { chatRoomId: number; text: string },
    cb: (res: SendRes) => void,
  ) => void;
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  'http://localhost:3000/chats',
  {
    path: '/ws', // 어댑터에서 /ws로 설정했으면 유지
    auth: { userId: 1 }, // DEV ONLY
    transports: ['websocket'],
  },
);

socket.on('connect', () => {
  console.log('connected', socket.id);

  socket.emit('ping', (res) => console.log('ping-res', res));
  socket.emit('room.join', { chatRoomId: 1 }, (res) =>
    console.log('join-res', res),
  );
  socket.emit('message.send', { chatRoomId: 1, text: 'hello' }, (res) =>
    console.log('send-res', res),
  );
});

socket.on('message.new', (msg) => console.log('message.new', msg));

socket.on('connect_error', (err) => {
  console.error('connect_error', err.message);
});
