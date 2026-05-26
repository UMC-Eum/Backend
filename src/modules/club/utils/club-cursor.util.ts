import { AppException } from '../../../common/errors/app.exception';
import { ClubListSort } from '../dtos/club.dto';
import type {
  ClubListRow,
  ListClubsRepositoryParams,
  ListMyClubsRepositoryParams,
  MyClubRow,
} from '../repositories/club.repository.types';

type ClubCursorPayload =
  | {
      sort: ClubListSort.RECENT;
      sortAt: string;
      clubId: string;
    }
  | {
      sort: ClubListSort.POPULAR | ClubListSort.LIKES;
      sortValue: number;
      clubId: string;
    };

type MyClubCursorPayload = {
  joinedAt: string;
  clubUserId: string;
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

export function decodeClubCursor(
  cursor: string,
  sort: ClubListSort,
): ListClubsRepositoryParams['cursor'] {
  try {
    const parsed = JSON.parse(b64urlDecode(cursor)) as Record<string, unknown>;

    if (parsed.sort !== sort || typeof parsed.clubId !== 'string') {
      throw new Error('invalid club cursor');
    }

    if (sort === ClubListSort.RECENT) {
      if (typeof parsed.sortAt !== 'string') {
        throw new Error('invalid club cursor sortAt');
      }

      return {
        type: 'DATE',
        sortAt: new Date(parsed.sortAt),
        clubId: BigInt(parsed.clubId),
      };
    }

    if (typeof parsed.sortValue !== 'number') {
      throw new Error('invalid club cursor sortValue');
    }

    return {
      type: 'NUMBER',
      sortValue: parsed.sortValue,
      clubId: BigInt(parsed.clubId),
    };
  } catch {
    throw new AppException('VALIDATION_INVALID_FORMAT', {
      message: 'cursor 형식이 올바르지 않습니다.',
    });
  }
}

export function encodeClubCursor(row: ClubListRow, sort: ClubListSort): string {
  return b64urlEncode(JSON.stringify(toClubCursorPayload(row, sort)));
}

export function decodeMyClubCursor(
  cursor: string,
): ListMyClubsRepositoryParams['cursor'] {
  try {
    const parsed = JSON.parse(b64urlDecode(cursor)) as Record<string, unknown>;

    if (
      typeof parsed.joinedAt !== 'string' ||
      typeof parsed.clubUserId !== 'string'
    ) {
      throw new Error('invalid my club cursor');
    }

    return {
      joinedAt: new Date(parsed.joinedAt),
      clubUserId: BigInt(parsed.clubUserId),
    };
  } catch {
    throw new AppException('VALIDATION_INVALID_FORMAT', {
      message: 'cursor 형식이 올바르지 않습니다.',
    });
  }
}

export function encodeMyClubCursor(row: MyClubRow): string {
  return b64urlEncode(JSON.stringify(toMyClubCursorPayload(row)));
}

function toClubCursorPayload(
  row: ClubListRow,
  sort: ClubListSort,
): ClubCursorPayload {
  if (sort === ClubListSort.RECENT) {
    return {
      sort,
      sortAt: row.createdAt.toISOString(),
      clubId: row.id.toString(),
    };
  }

  return {
    sort,
    sortValue: row.likes,
    clubId: row.id.toString(),
  };
}

function toMyClubCursorPayload(row: MyClubRow): MyClubCursorPayload {
  return {
    joinedAt: row.joinedAt.toISOString(),
    clubUserId: row.id.toString(),
  };
}
