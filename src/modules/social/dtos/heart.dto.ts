export interface HeartItemBase {
  heartId: number;
  createdAt: string;
}

export interface UserProfileInfo {
  profileImageUrl: string;
  nickname: string;
  age: number;
}

// Repository에서 반환하는 기본 타입 (프로필 정보 없음)
export interface HeartSentItemBasic extends HeartItemBase {
  targetUserId: number;
}

export interface HeartReceivedItemBasic extends HeartItemBase {
  fromUserId: number;
}

// API 응답용 타입 (프로필 정보 포함)
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
