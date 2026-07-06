import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PushDeviceTokenController } from './controllers/push-device-token.controller';
import { PushDeviceTokenRepository } from './repositories/push-device-token.repository';
import { FcmPushService } from './services/fcm-push.service';
import { PushDeviceTokenService } from './services/push-device-token.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PushDeviceTokenController],
  providers: [
    PushDeviceTokenRepository,
    PushDeviceTokenService,
    FcmPushService,
  ],
  exports: [FcmPushService],
})
export class PushModule {}
