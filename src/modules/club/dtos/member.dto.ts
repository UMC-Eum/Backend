import { ClubAuthority, ClubUserStatus } from '@prisma/client';

export interface JoinClubRequestDto {
  message: string;
}

export interface ClubMemberItemDto {
  clubUserId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  authority: ClubAuthority;
  joinedAt: string;
  badges: { badgeId: number; name: string }[];
}

export interface ClubMembersResponseDto {
  members: ClubMemberItemDto[];
  nextCursor: string | null;
}

export interface JoinClubResponseDto {
  clubUserId: number;
  clubId: number;
  userId: number;
  authority: ClubAuthority;
  status: ClubUserStatus;
  joinedAt: string;
}

export interface LeaveClubResponseDto {
  clubId: number;
  userId: number;
  leftAt: string;
  clubDeleted: boolean;
}

export interface PermitClubMemberRequestDto {
  status: Extract<ClubUserStatus, 'ACTIVE' | 'REJECTED'>;
}

export interface PermitClubMemberResponseDto {
  clubUserId: number;
  clubId: number;
  userId: number;
  status: ClubUserStatus;
  permittedAt: string;
}

export interface KickClubMemberRequestDto {
  reason: string;
}

export interface KickClubMemberResponseDto {
  clubId: number;
  userId: number;
  kickedAt: string;
}

export interface ChangeClubMemberAuthorityRequestDto {
  authority: ClubAuthority;
}

export interface ChangeClubMemberAuthorityResponseDto {
  clubUserId: number;
  clubId: number;
  userId: number;
  authority: ClubAuthority;
  updatedAt: string;
}
