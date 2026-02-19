import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import type { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const corsOrigin = [
      'https://eum-dating.com',
      'https://back.eum-dating.com',
      'http://localhost:5173',
      'http://192.168.35.179:5173',
      'http://localhost:3000',
      'http://localhost:5000',
    ];

    const mergedOptions: ServerOptions = {
      ...(options ?? ({} as ServerOptions)),
      path: '/ws',
      cors: { origin: corsOrigin, credentials: true },

      // serveClient가 타입상 필수(boolean)인 환경이 있어서 명시해줘야 함
      // socket.io client 파일을 서버에서 굳이 서빙할 필요 없으니 보통 false
      serveClient: options?.serveClient ?? false,
    };

    // IoAdapter 쪽 리턴 타입이 any로 잡히는 버전이 있어 ESLint no-unsafe-return 방지용 캐스팅
    return super.createIOServer(port, mergedOptions) as unknown as Server;
  }
}
