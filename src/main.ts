import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ config 읽기
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // ✅ API prefix (팀 규칙으로 고정 추천)
  app.setGlobalPrefix('api/v1');

  // ✅ CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // ✅ validation (전역 파이프)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 값 제거
      forbidNonWhitelisted: true, // DTO에 없는 값 들어오면 에러
      transform: true, // query param string -> number 등 변환 도움
    }),
  );

  await app.listen(port);
}
bootstrap();
