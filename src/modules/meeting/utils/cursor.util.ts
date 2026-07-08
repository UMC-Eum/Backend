import { AppException } from '../../../common/errors/app.exception';
import { decodeCursorRaw } from '../../../common/utils/cursor.util';

export type AttendeesCursor = {
  joinedAt: Date;
  id: bigint;
};

export function decodeAttendeesCursor(cursor: string): AttendeesCursor {
  const parsed = decodeCursorRaw(cursor);
  if (typeof parsed.joinedAt !== 'string' || typeof parsed.id !== 'string') {
    throwInvalid();
  }
  const joinedAt = new Date(parsed.joinedAt);
  if (Number.isNaN(joinedAt.getTime())) {
    throwInvalid();
  }
  let id: bigint;
  try {
    id = BigInt(parsed.id);
  } catch {
    throwInvalid();
  }
  return { joinedAt, id };
}

function throwInvalid(): never {
  throw new AppException('VALIDATION_INVALID_FORMAT', {
    message: 'cursor 형식이 올바르지 않습니다.',
  });
}
