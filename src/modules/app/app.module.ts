import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envSchema } from '../../config/env.schema';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from 'src/infra/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

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
    NotificationModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
