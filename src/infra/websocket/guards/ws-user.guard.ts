import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { DefaultEventsMap, Socket } from 'socket.io';

import { AppException } from '../../../common/errors/app.exception';

type SocketData = { userId?: number };

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

@Injectable()
export class WsUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthedSocket>();
    const userId = client.data.userId;

    if (typeof userId !== 'number') {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    return true;
  }
}
