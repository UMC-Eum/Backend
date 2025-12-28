import type { ErrorCode } from '../errors/error-codes';

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiErrorBody;
  timestamp: string;
  path: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
