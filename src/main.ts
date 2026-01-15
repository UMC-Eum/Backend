import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import type { Request, NextFunction, Response } from 'express';
import pinoHttp from 'pino-http';

import { AppModule } from './modules/app/app.module';
import { createPinoLogger } from './infra/logger/pino';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppException } from './common/errors/app.exception';
import { setupSwagger } from './swagger';

function isRequiredError(errors: ValidationError[]): boolean {
  const requiredKeys = new Set(['isNotEmpty', 'isDefined', 'isNotNull']);

  return errors.some((e) => {
    const constraints = e.constraints;
    if (!constraints) return false;

    return Object.keys(constraints).some((k) => requiredKeys.has(k));
  });
}

function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const decodeValue = (value: string): string => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((acc, entry) => {
      const [rawKey, ...valueParts] = entry.trim().split('=');
      if (!rawKey) {
        return acc;
      }

      acc[rawKey] = decodeValue(valueParts.join('='));
      return acc;
    }, {});
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
  type CookieRequest = Request & { cookies: Record<string, string> };

  app.use((req: CookieRequest, _res: Response, next: NextFunction) => {
    req.cookies = parseCookieHeader(req.headers.cookie);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        const required = isRequiredError(errors);

        return new AppException(
          required
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
