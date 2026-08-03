import {
  ClubAuthority,
  ClubCategory,
  ClubUserStatus,
  Prisma,
} from '@prisma/client';
import { ClubListSort } from '../dtos/club.dto';

export interface ListClubsRepositoryParams {
  viewerId: bigint;
  keyword?: string;
  category?: ClubCategory;
  code?: string;
  sort: ClubListSort;
  cursor?:
    | { type: 'DATE'; sortAt: Date; clubId: bigint }
    | { type: 'NUMBER'; sortValue: number; clubId: bigint };
  limit: number;
}

export const CLUB_LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  introText: true,
  category: true,
  capacity: true,
  thumbnailUrl: true,
  likes: true,
  createdAt: true,
  user: {
    select: {
      nickname: true,
      deletedAt: true,
      status: true,
    },
  },
  _count: {
    select: {
      clubUsers: {
        where: {
          leftAt: null,
          status: ClubUserStatus.ACTIVE,
        },
      },
    },
  },
} satisfies Prisma.ClubSelect;

export type ClubListRow = Prisma.ClubGetPayload<{
  select: typeof CLUB_LIST_SELECT;
}>;

export const CLUB_DETAIL_SELECT = {
  id: true,
  hostId: true,
  name: true,
  category: true,
  thumbnailUrl: true,
  introText: true,
  capacity: true,
  approvalRequired: true,
  likes: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      deletedAt: true,
      status: true,
    },
  },
  meetings: {
    where: {
      deletedAt: null,
      isRegular: true,
    },
    select: {
      id: true,
      name: true,
      recurrenceType: true,
      daysOfWeek: true,
      hour: true,
      minute: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  clubImages: {
    where: { deletedAt: null },
    select: {
      clubImageId: true,
      imageUrl: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
  _count: {
    select: {
      clubUsers: {
        where: {
          leftAt: null,
          status: ClubUserStatus.ACTIVE,
        },
      },
    },
  },
} satisfies Prisma.ClubSelect;

export type ClubDetailRow = Prisma.ClubGetPayload<{
  select: typeof CLUB_DETAIL_SELECT;
}>;

export const UPDATE_CLUB_SELECT = {
  id: true,
  name: true,
  category: true,
  thumbnailUrl: true,
  introVoiceUrl: true,
  introText: true,
  capacity: true,
  updatedAt: true,
  clubImages: {
    where: { deletedAt: null },
    select: {
      imageUrl: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
} satisfies Prisma.ClubSelect;

export type UpdatedClubRow = Prisma.ClubGetPayload<{
  select: typeof UPDATE_CLUB_SELECT;
}>;

export interface UpdateClubRepositoryParams {
  clubId: bigint;
  data: Prisma.ClubUpdateInput;
  imageUrls?: string[];
  vibeVector?: number[];
}

export interface TopHostRow {
  hostId: bigint;
  hostName: string;
  profileImageUrl: string | null;
  clubCount: number;
  totalLikes: number;
}

export interface TodayRecommendedClubRow {
  clubId: bigint;
  addressCode: string | null;
  name: string;
  category: ClubCategory;
  introText: string | null;
  thumbnailUrl: string | null;
  capacity: number;
  likes: number;
  hostId: bigint;
  hostName: string;
  hostProfileImageUrl: string | null;
  memberCount: number;
  recommendationScore: number;
}

export interface ClubUserStateRow {
  authority: ClubAuthority;
  status: ClubUserStatus;
  leftAt: Date | null;
}

export interface CreateClubRepositoryParams {
  hostId: bigint;
  name: string;
  category: ClubCategory;
  introText: string;
  capacity: number;
  addressCode: string | null;
  approvalRequired: boolean;
  boardPublic: boolean;
  thumbnailUrl: string;
  imageUrls?: string[];
}

export interface CreatedClubRow {
  id: bigint;
  code: string | null;
  name: string;
  category: ClubCategory;
  capacity: number;
  thumbnailUrl: string | null;
  approvalRequired: boolean;
  boardPublic: boolean;
  createdAt: Date;
  user: {
    id: bigint;
    nickname: string;
    profileImageUrl: string | null;
  } | null;
  _count: {
    clubUsers: number;
  };
  clubImages: Array<{
    imageUrl: string;
    sortOrder: number;
  }>;
}

export interface CreateClubLikeResult {
  clubId: bigint;
  likeCount: number;
  isDuplicate: boolean;
}

export interface DeleteClubLikeResult {
  clubId: bigint;
  likeCount: number;
  isMissing: boolean;
}

export interface SoftDeletedClubRow {
  id: bigint;
  deletedAt: Date | null;
}
