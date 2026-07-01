import { AppException } from '../../../common/errors/app.exception';
import { decodeCursorRaw } from '../../../common/utils/cursor.util';

export { encodeCursor } from '../../../common/utils/cursor.util';

export type MessageCursorPayload = {
  sortAt: string;
  messageId: string;
};

export type RoomCursorPayload = {
  sortAt: string;
  roomId: string;
};

export function decodeMessageCursor(cursor: string): MessageCursorPayload {
  const parsed = decodeCursorRaw(cursor);
  if (
    typeof parsed.sortAt === 'string' &&
    typeof parsed.messageId === 'string'
  ) {
    return { sortAt: parsed.sortAt, messageId: parsed.messageId };
  }
  throw new AppException('VALIDATION_INVALID_FORMAT', {
    message: 'cursor 형식이 올바르지 않습니다.',
  });
}

export function decodeRoomCursor(cursor: string): RoomCursorPayload {
  const parsed = decodeCursorRaw(cursor);
  if (typeof parsed.sortAt === 'string' && typeof parsed.roomId === 'string') {
    return { sortAt: parsed.sortAt, roomId: parsed.roomId };
  }
  throw new AppException('VALIDATION_INVALID_FORMAT', {
    message: 'cursor 형식이 올바르지 않습니다.',
  });
}
