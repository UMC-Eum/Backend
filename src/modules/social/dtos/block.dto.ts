import { BlockStatus } from '@prisma/client';

export interface BlockDto {
  blockId: number;
  status: BlockStatus;
  blockedAt: string;
}

export interface BlockListItem extends BlockDto {
  targetUserId: number;
  reason: string;
}

export interface BlockListPayload {
  nextCursor: string | null;
  items: BlockListItem[];
}
