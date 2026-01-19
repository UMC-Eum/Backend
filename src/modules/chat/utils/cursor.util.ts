import { AppException } from '../../../common/errors/app.exception';

export type MessageCursorPayload = {
  sortAt: string;
  messageId: string;
};

export type RoomCursorPayload = {
  sortAt: string;
  roomId: string;
};

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function b64urlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input + '='.repeat(padLen);
  const base64 = padded.replaceAll('-', '+').replaceAll('_', '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function encodeCursor(
  payload: MessageCursorPayload | RoomCursorPayload,
): string {
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeCursor(
  cursor: string,
): MessageCursorPayload | RoomCursorPayload {
  try {
    const json = b64urlDecode(cursor);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    if (!parsed.sortAt || typeof parsed.sortAt !== 'string') {
      throw new Error('invalid cursor: missing or invalid sortAt');
    }

    // messageId가 있으면 MessageCursorPayload, roomId가 있으면 RoomCursorPayload
    if (parsed.messageId && typeof parsed.messageId === 'string') {
      return { sortAt: parsed.sortAt, messageId: parsed.messageId };
    }

    if (parsed.roomId && typeof parsed.roomId === 'string') {
      return { sortAt: parsed.sortAt, roomId: parsed.roomId };
    }

    throw new Error('invalid cursor: missing both messageId and roomId');
  } catch {
    throw new AppException('VALIDATION_INVALID_FORMAT', {
      message: 'cursor 형식이 올바르지 않습니다.',
    });
  }
}
