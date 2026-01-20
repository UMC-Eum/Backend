export interface HeartItemBase {
  heartId: number;
  createdAt: string;
}

export interface HeartSentItem extends HeartItemBase {
  targetUserId: number;
}

export interface HeartReceivedItem extends HeartItemBase {
  fromUserId: number;
}

export interface HeartListPayload<T extends HeartItemBase> {
  nextCursor: string | null;
  items: T[];
}
