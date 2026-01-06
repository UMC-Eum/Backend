import type { ExternalErrorCode } from '../errors/error-codes';

export type ResultType = 'SUCCESS' | 'FAIL';

export interface ApiMeta {
  timestamp: string;
  path: string;
}

export interface ApiSuccessResponse<T> {
  resultType: 'SUCCESS';
  success: { data: T };
  error: null;
  meta: ApiMeta;
}

export interface ApiFailResponse {
  resultType: 'FAIL';
  success: null;
  error: { code: ExternalErrorCode | string; message: string };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailResponse;
