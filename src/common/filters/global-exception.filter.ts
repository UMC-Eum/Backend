import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import type { Logger as PinoLogger } from 'pino';
import { ERROR_CODE, type ErrorCode } from '../errors/error-codes';
import type { ApiErrorResponse } from '../dto/api-response.dto';
import { AppException } from '../errors/app.exception';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function pickDefaultCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ERROR_CODE.COMMON_BAD_REQUEST;
    case 401:
      return ERROR_CODE.COMMON_UNAUTHORIZED;
    case 403:
      return ERROR_CODE.COMMON_FORBIDDEN;
    case 404:
      return ERROR_CODE.COMMON_NOT_FOUND;
    case 409:
      return ERROR_CODE.COMMON_CONFLICT;
    case 429:
      return ERROR_CODE.COMMON_TOO_MANY_REQUESTS;
    default:
      return ERROR_CODE.COMMON_INTERNAL_ERROR;
  }
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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ERROR_CODE.COMMON_INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown;

    // 1) AppException (우리 커스텀)
    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = pickDefaultCode(status);

      const body = exception.getResponse();
      if (isRecord(body)) {
        const bodyCode = body.code;
        const bodyMessage = body.message;
        const bodyDetails = body.details;

        if (typeof bodyCode === 'string') code = bodyCode as ErrorCode;
        if (typeof bodyMessage === 'string') message = bodyMessage;
        if (bodyDetails !== undefined) details = bodyDetails;
      } else if (typeof body === 'string') {
        message = body;
      }
    }
    // 2) Nest HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = pickDefaultCode(status);

      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (isRecord(body)) {
        // Nest 기본 에러 형태: { statusCode, message, error }
        const bodyMessage = body.message;
        const bodyError = body.error;

        if (typeof bodyMessage === 'string') {
          message = bodyMessage;
        } else if (Array.isArray(bodyMessage)) {
          // ValidationPipe 에러는 message가 string[]로 오는 경우가 많음
          message = 'Validation failed';
          details = bodyMessage;
          code = ERROR_CODE.COMMON_VALIDATION_ERROR;
        }

        if (details === undefined && bodyError !== undefined) {
          details = bodyError;
        }
      } else {
        message = exception.message;
      }
    }
    // 3) ZodError (zod validation)
    else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = ERROR_CODE.COMMON_VALIDATION_ERROR;
      message = 'Validation failed';
      details = exception.flatten();
    }
    // 4) Unknown
    else if (exception instanceof Error) {
      message = exception.message || message;
      details =
        process.env.NODE_ENV === 'production' ? undefined : exception.stack;
    }

    const body: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      timestamp,
      path,
    };

    // 로깅 (pino 있으면 그걸로)
    if (this.logger) {
      this.logger.error(
        {
          status,
          code,
          path,
          method: req.method,
          details,
        },
        message,
      );
    }

    res.status(status).json(body);
  }
}
