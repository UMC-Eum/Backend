import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateHeartRequestDto {
  @ApiProperty({
    description: '하트를 받을 대상 유저 ID',
    example: '24',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9][0-9]*$/)
  targetUserId: string;
}

export interface UserProfileInfo {
  id: number;
  nickname: string;
  birthdate: string;
  profileImageUrl: string | null;
  introText: string | null;
  introVoiceUrl: string | null;
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
  targetUserId: number | null;
  targetUser: UserProfileInfo;
}

export interface HeartReceivedItem extends HeartItemBase {
  fromUserId: number | null;
  fromUser: UserProfileInfo;
}

export interface HeartListPayload<T extends HeartItemBase> {
  nextCursor: string | null;
  items: T[];
}
