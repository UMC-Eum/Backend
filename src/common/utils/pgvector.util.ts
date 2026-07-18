import { AppException } from '../errors/app.exception';

export function toPgVectorLiteral(vector: readonly number[]): string {
  if (
    !Array.isArray(vector) ||
    vector.length === 0 ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new AppException('VALIDATION_INVALID_FORMAT');
  }

  return `[${vector.join(',')}]`;
}
