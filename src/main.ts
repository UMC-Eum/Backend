import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';
import { setupSwagger } from './swagger';

import pinoHttp from 'pino-http';
import { createPinoLogger } from './infra/logger/pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix('api/v1'); 

  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const logger = createPinoLogger();
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
    }),
  );

  setupSwagger(app);

  await app.listen(port);
}
bootstrap();
