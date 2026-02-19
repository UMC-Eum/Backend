import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { AppException } from '../errors/app.exception';
import type { ExternalErrorCode } from '../errors/error-codes';
import type { ApiFailResponse } from '../dto/api-response.dto';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ws = host.switchToWs();
    const client = ws.getClient<Socket>();

    const timestamp = new Date().toISOString();
    const path = `ws${client?.nsp?.name ?? ''}`;

    let code: ExternalErrorCode = 'SYS-001';
    let message = '잠시 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';

    if (exception instanceof AppException) {
      const body = exception.getResponse();

      if (isRecord(body)) {
        if (typeof body.code === 'string') {
          code = body.code as ExternalErrorCode;
        }
        if (typeof body.message === 'string') {
          message = body.message;
        }
      } else if (typeof body === 'string') {
        message = body;
      }
    } else if (exception instanceof WsException) {
      const err = exception.getError();
      if (typeof err === 'string') {
        message = err;
      } else if (isRecord(err)) {
        if (typeof err.code === 'string') {
          code = err.code as ExternalErrorCode;
        }
        if (typeof err.message === 'string') {
          message = err.message;
        }
      }
    } else if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (exception.message) {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      if (process.env.NODE_ENV !== 'production' && exception.message) {
        message = exception.message;
      }
    }

    const payload: ApiFailResponse = {
      resultType: 'FAIL',
      success: null,
      error: { code, message },
      meta: { timestamp, path },
    };

    // socket.io 기반 NestWS는 기본적으로 'exception' 이벤트로 에러를 전달
    client?.emit('exception', payload);
  }
}
