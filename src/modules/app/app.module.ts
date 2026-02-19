import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envSchema } from '../../config/env.schema';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from 'src/infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SocialModule } from '../social/social.module';
import { ChatModule } from '../chat/chat.module';
import { AgreementModule } from '../agreements/agreement.module';
import { NotificationModule } from '../notification/notification.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { WebsocketCommonModule } from 'src/infra/websocket/websocket-common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 전역 모듈로 설정
      envFilePath: ['.env'], // 환경 변수 파일 경로
      validate: (config) => {
        const parsed = envSchema.safeParse(config);
        if (!parsed.success) {
          const formatted = parsed.error.flatten().fieldErrors;
          throw new Error(
            `Invalid environment variables: ${JSON.stringify(formatted)}`,
          );
        }
        return parsed.data;
      },
    }),
    HealthModule,
    PrismaModule,
    WebsocketCommonModule,
    SocialModule,
    ChatModule,
    AgreementModule,
    NotificationModule,
    OnboardingModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
