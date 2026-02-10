export interface UserProfileInfo {
  profileImageUrl: string | null;
  nickname: string;
  age: number;
}

export interface HeartItemBase {
  heartId: number;
  createdAt: string;
}

export interface HeartSentItem extends HeartItemBase {
  targetUserId: number;
  targetUser: UserProfileInfo;
}

export interface HeartReceivedItem extends HeartItemBase {
  fromUserId: number;
  fromUser: UserProfileInfo;
}

export interface HeartListPayload<T extends HeartItemBase> {
  nextCursor: string | null;
  items: T[];
}
