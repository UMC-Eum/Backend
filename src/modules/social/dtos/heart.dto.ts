export interface UserProfileInfo {
  id: number;
  nickname: string;
  birthdate: string;
  profileImageUrl: string | null;
  introText: string | null;
  introVoiceUrl: string | null;
  vibeVector: any;
  address: {
    fullName: string;
  };
  interests: Array<{
    interestId: number;
    interest: {
      body: string | null;
    };
  }>;
  personalities: Array<{
    personalityId: number;
    personality: {
      body: string | null;
    };
  }>;
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
