import { HttpException } from '@nestjs/common';
import { getErrorDefinition, type InternalErrorCode } from './error-codes';

export class AppException extends HttpException {
  readonly internalCode: InternalErrorCode;
  readonly details?: unknown;

  constructor(
    internalCode: InternalErrorCode,
    opts?: { message?: string; details?: unknown },
  ) {
    const def = getErrorDefinition(internalCode);

    super(
      {
        internalCode,
        code: def.code, // 외부코드 (AUTH-001 등)
        message: opts?.message ?? def.message,
        details: opts?.details, // 응답엔 안 내리고 로그용으로만 사용
      },
      def.status,
    );

    this.internalCode = internalCode;
    this.details = opts?.details;
  }
}
