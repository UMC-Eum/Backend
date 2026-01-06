import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Logger as PinoLogger } from 'pino';
import { AppException } from '../errors/app.exception';
import {
  DEFAULT_ERROR,
  type ExternalErrorCode,
} from '../errors/error-codes';
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

    // 기본값(예상 못한 에러)
    let status = 503;
    let code: ExternalErrorCode | string = 'SYS-001';
    let message = '잠시 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
    let detailsForLog: unknown;

    // 1) AppException (우리 표준)
    if (exception instanceof AppException) {
      status = exception.getStatus();

      const body = exception.getResponse();
      if (isRecord(body)) {
        if (typeof body.code === 'string') code = body.code;
        if (typeof body.message === 'string') message = body.message;
        if (body.details !== undefined) detailsForLog = body.details;
      } else {
        // 혹시 string으로 오면
        message = String(body);
        detailsForLog = body;
      }
    }
    // 2) Nest HttpException (ValidationPipe 등)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      detailsForLog = body;

      // 여기서도 포맷은 고정 (SYS-001로 통일 or 필요시 분기 가능)
      // 형님 표에 없는 케이스는 기본값으로 처리
    }
    // 3) 일반 Error
    else if (exception instanceof Error) {
      detailsForLog =
        process.env.NODE_ENV === 'production' ? undefined : exception.stack;
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
