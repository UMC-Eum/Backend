import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes';

export interface AppExceptionPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppException extends HttpException {
  constructor(status: HttpStatus, payload: AppExceptionPayload) {
    super(payload, status);
  }
}
