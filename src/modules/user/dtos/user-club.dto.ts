import { ClubAuthority, ClubCategory } from '@prisma/client';

export type MyClubRoleFilter = 'ALL' | 'HOST' | 'MEMBER';

export interface MyClubItemDto {
  clubId: number;
  name: string;
  category: ClubCategory;
  introText: string | null;
  thumbnailUrl: string | null;
  capacity: number;
  memberCount: number;
  likes: number;
  myAuthority: ClubAuthority;
  joinedAt: string;
}

export interface MyLikedClubItemDto {
  clubId: number;
  name: string;
  category: ClubCategory;
  introText: string | null;
  thumbnailUrl: string | null;
  memberCount: number;
  likeCount: number;
  isJoined: boolean;
  likedAt: string;
}
