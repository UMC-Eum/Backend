import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../../modules/auth/auth.module';

import { WsAuthService } from './auth/ws-auth.service';
import { WsUserGuard } from './guards/ws-user.guard';
import { PRESENCE_STORE } from './presence/presence.token';
import { InMemoryPresenceStore } from './presence/in-memory-presence.store';

@Global()
@Module({
  imports: [AuthModule],
  providers: [
    WsAuthService,
    WsUserGuard,
    { provide: PRESENCE_STORE, useClass: InMemoryPresenceStore },
  ],
  exports: [WsAuthService, WsUserGuard, PRESENCE_STORE],
})
export class WebsocketCommonModule {}
