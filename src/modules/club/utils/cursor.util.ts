import { AppException } from '../../../common/errors/app.exception';
import { decodeCursorRaw } from '../../../common/utils/cursor.util';

export type AttendeesCursorPayload = {
  joinedAt: string;
  id: string;
};

export function decodeAttendeesCursor(cursor: string): AttendeesCursorPayload {
  const parsed = decodeCursorRaw(cursor);
  if (typeof parsed.joinedAt === 'string' && typeof parsed.id === 'string') {
    return { joinedAt: parsed.joinedAt, id: parsed.id };
  }
  throw new AppException('VALIDATION_INVALID_FORMAT', {
    message: 'cursor 형식이 올바르지 않습니다.',
  });
}
