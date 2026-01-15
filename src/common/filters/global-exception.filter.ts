import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Logger as PinoLogger } from 'pino';
import { AppException } from '../errors/app.exception';
import type { ExternalErrorCode } from '../errors/error-codes';
import type { ApiFailResponse } from '../dto/api-response.dto';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger?: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    const path = req.originalUrl || req.url;

    // 기본값
    let status = 503;
    let code: ExternalErrorCode = 'SYS-001';
    let message = '잠시 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
    let detailsForLog: unknown;

    // 1) AppException
    if (exception instanceof AppException) {
      status = exception.getStatus();

      const body = exception.getResponse();
      if (isRecord(body)) {
        if (typeof body.code === 'string') {
          code = body.code as ExternalErrorCode;
        }
        if (typeof body.message === 'string') {
          message = body.message;
        }
        if (body.details !== undefined) {
          detailsForLog = body.details;
        }
      } else if (typeof body === 'string') {
        message = body;
      } else {
        detailsForLog = body;
      }
    }
    // 2) Nest HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      detailsForLog = body;

      // message는 객체 stringify로 깨질 수 있으니 기본 유지
      if (typeof body === 'string') {
        message = body;
      } else if (exception.message) {
        message = exception.message;
      }
    }
    // 3) 일반 Error
    else if (exception instanceof Error) {
      detailsForLog =
        process.env.NODE_ENV === 'production' ? undefined : exception.stack;

      if (process.env.NODE_ENV !== 'production' && exception.message) {
        message = exception.message;
      }
    }

    const responseBody: ApiFailResponse = {
      resultType: 'FAIL',
      success: null,
      error: { code, message },
      meta: { timestamp, path },
    };

    if (this.logger) {
      this.logger.error(
        {
          status,
          code,
          path,
          method: req.method,
          details: detailsForLog,
        },
        message,
      );
    }

    res.status(status).json(responseBody);
  }
}
