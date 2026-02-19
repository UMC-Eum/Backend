import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
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

function toErrorInfo(e: unknown): { name: string; message: string; stack?: string } {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack };
  }
  return { name: 'UnknownError', message: String(e) };
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return '[unserializable]';
  }
}

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ws = host.switchToWs();
    const client = ws.getClient<Socket>();

    const timestamp = new Date().toISOString();
    const path = `ws${client?.nsp?.name ?? ''}`;

    const socketId = client?.id ?? 'N/A';
    const ip = (client?.handshake as { address?: string } | undefined)?.address;

    // Socket.data는 프로젝트에서 타입을 강하게 안 박았을 수 있어서 unknown 처리
    const dataUnknown = (client as unknown as { data?: unknown }).data;
    const userId =
      isRecord(dataUnknown) && typeof dataUnknown.userId === 'number'
        ? dataUnknown.userId
        : undefined;

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

      // 예상 가능한 도메인 예외: 운영 관점에서 원인 파악 가능하도록 warn 로깅
      this.logger.warn(
        `ws app exception: code=${code} socket=${socketId} userId=${String(userId)} ip=${String(ip)} path=${path}`,
      );
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

      // 예상 가능한 WS 예외: warn 로깅
      this.logger.warn(
        `ws exception: code=${code} socket=${socketId} userId=${String(userId)} ip=${String(ip)} path=${path} detail=${safeJson(err)}`,
      );
    } else if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (exception.message) {
        message = exception.message;
      }

      // HTTP 예외가 WS로 흘러온 케이스: warn 로깅
      this.logger.warn(
        `ws http exception: status=${exception.getStatus()} socket=${socketId} userId=${String(userId)} ip=${String(ip)} path=${path} detail=${safeJson(body)}`,
      );
    } else if (exception instanceof Error) {
      // 예상 못한 서버 에러: 반드시 error + stack 로깅 (피드백 해결 핵심)
      const info = toErrorInfo(exception);
      this.logger.error(
        `ws unexpected error: socket=${socketId} userId=${String(userId)} ip=${String(ip)} path=${path} err=${info.name}:${info.message}`,
        info.stack,
      );

      if (process.env.NODE_ENV !== 'production' && exception.message) {
        message = exception.message;
      }
    } else {
      // unknown도 로깅
      const info = toErrorInfo(exception);
      this.logger.error(
        `ws unknown throw: socket=${socketId} userId=${String(userId)} ip=${String(ip)} path=${path} err=${info.name}:${info.message}`,
      );

      if (process.env.NODE_ENV !== 'production') {
        message = info.message;
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
