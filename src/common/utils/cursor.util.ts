import { AppException } from '../errors/app.exception';

export type CursorPayload = {
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

export function encodeCursor(payload: CursorPayload): string {
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = b64urlDecode(cursor);
    const parsed = JSON.parse(json) as Partial<CursorPayload>;

    if (!parsed.sortAt || !parsed.roomId) {
      throw new Error('invalid cursor');
    }

    return { sortAt: parsed.sortAt, roomId: parsed.roomId };
  } catch {
    throw new AppException('VALIDATION_INVALID_FORMAT', {
      message: 'cursor 형식이 올바르지 않습니다.',
    });
  }
}
