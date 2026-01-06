import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import pinoHttp from 'pino-http';

import { AppModule } from './modules/app/app.module';
import { setupSwagger } from './swagger';
import { createPinoLogger } from './infra/logger/pino';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppException } from './common/errors/app.exception';

function isRequiredError(errors: any[]): boolean {
  const requiredKeys = new Set(['isNotEmpty', 'isDefined', 'isNotNull']);
  return errors.some((e) => {
    const constraints = e?.constraints ?? {};
    return Object.keys(constraints).some((k) => requiredKeys.has(k));
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => {
        const isRequired = isRequiredError(errors as any[]);
        throw new AppException(
          isRequired
            ? 'VALIDATION_REQUIRED_FIELD_MISSING'
            : 'VALIDATION_INVALID_FORMAT',
          { details: errors },
        );
      },
    }),
  );

  const logger = createPinoLogger();

  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  setupSwagger(app);

  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
