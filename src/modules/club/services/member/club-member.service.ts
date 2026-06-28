import { Injectable } from '@nestjs/common';
import { ClubUser, ClubUserStatus } from '@prisma/client';
import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../repositories/club.repository';
import { ClubMemberRepository } from '../../repositories/club-member.repository';
import {
  ClubMemberListItemDto,
  ClubMemberListResponseDto,
  ClubMemberRequestListResponseDto,
  ClubMemberRequestItemDto,
  ClubMemberResponseDto,
  CreateClubMemberRequestDto,
  LeaveClubMemberResponseDto,
  UpdateClubMemberStatusRequestDto,
} from '../../dtos/club-member.dto';

@Injectable()
export class ClubMemberService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly clubMemberRepository: ClubMemberRepository,
  ) {}

  async requestJoin(
    userId: bigint,
    clubId: bigint,
    dto: CreateClubMemberRequestDto,
  ): Promise<ClubMemberResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const existing = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      userId,
    );

    if (!existing) {
      const created = await this.clubMemberRepository.createRequest({
        clubId,
        userId,
        message: dto.message,
      });
      return this.toResponse(created);
    }

    if (
      existing.status === ClubUserStatus.REJECTED ||
      existing.status === ClubUserStatus.LEFT
    ) {
      const updated = await this.clubMemberRepository.resubmitRequest({
        clubId,
        userId,
        message: dto.message,
      });
      return this.toResponse(updated);
    }

    if (existing.status === ClubUserStatus.PENDING) {
      throw new AppException('CLUB_MEMBER_REQUEST_ALREADY_EXISTS');
    }

    if (existing.status === ClubUserStatus.ACTIVE) {
      throw new AppException('CLUB_MEMBER_ALREADY_EXISTS');
    }

    throw new AppException('CLUB_MEMBER_JOIN_FORBIDDEN');
  }

  async updateJoinRequestStatus(
    hostUserId: bigint,
    clubId: bigint,
    targetUserId: bigint,
    dto: UpdateClubMemberStatusRequestDto,
  ): Promise<ClubMemberResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== hostUserId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const result = await this.clubMemberRepository.updatePendingStatus({
      clubId,
      userId: targetUserId,
      status: dto.status,
    });
    if (result.count === 0) {
      throw new AppException('CLUB_MEMBER_REQUEST_NOT_FOUND');
    }

    const updated = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      targetUserId,
    );
    if (!updated) {
      throw new AppException('CLUB_MEMBER_REQUEST_NOT_FOUND');
    }

    return this.toResponse(updated);
  }

  async getJoinRequests(
    hostUserId: bigint,
    clubId: bigint,
  ): Promise<ClubMemberRequestListResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== hostUserId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const requests =
      await this.clubMemberRepository.findPendingRequests(clubId);

    return {
      items: requests.map((request) => this.toRequestItem(request)),
    };
  }

  async getMembers(
    userId: bigint,
    clubId: bigint,
  ): Promise<ClubMemberListResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const requester = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      userId,
    );
    if (!requester || requester.status !== ClubUserStatus.ACTIVE) {
      throw new AppException('CLUB_MEMBER_ONLY');
    }

    const members = await this.clubMemberRepository.findActiveMembers(clubId);

    return {
      items: members.map((member) => this.toMemberListItem(member)),
    };
  }

  async leave(
    userId: bigint,
    clubId: bigint,
  ): Promise<LeaveClubMemberResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId === userId) {
      throw new AppException('CLUB_HOST_LEAVE_FORBIDDEN');
    }

    const member = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      userId,
    );
    if (!member || member.status !== ClubUserStatus.ACTIVE) {
      throw new AppException('CLUB_MEMBER_ONLY');
    }

    const left = await this.clubMemberRepository.leave(clubId, userId);
    if (!left.leftAt) {
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    return {
      clubUserId: Number(left.id),
      clubId: Number(left.clubId),
      userId: Number(left.userId),
      status: left.status,
      leftAt: left.leftAt.toISOString(),
    };
  }

  private toResponse(member: ClubUser): ClubMemberResponseDto {
    return {
      clubUserId: Number(member.id),
      clubId: Number(member.clubId),
      userId: Number(member.userId),
      authority: member.authority,
      status: member.status,
      message: member.joinMessage,
      requestedAt: member.requestedAt.toISOString(),
      joinedAt: member.joinedAt?.toISOString() ?? null,
    };
  }

  private toRequestItem(
    member: ClubUser & {
      user: {
        nickname: string;
        profileImageUrl: string;
        age: number;
        sex: string;
      };
    },
  ): ClubMemberRequestItemDto {
    return {
      ...this.toResponse(member),
      nickname: member.user.nickname,
      profileImageUrl: member.user.profileImageUrl,
      age: member.user.age,
      sex: member.user.sex,
    };
  }

  private toMemberListItem(
    member: ClubUser & {
      user: {
        nickname: string;
        profileImageUrl: string;
        age: number;
        sex: string;
      };
    },
  ): ClubMemberListItemDto {
    return {
      clubUserId: Number(member.id),
      clubId: Number(member.clubId),
      userId: Number(member.userId),
      authority: member.authority,
      status: member.status,
      nickname: member.user.nickname,
      profileImageUrl: member.user.profileImageUrl,
      age: member.user.age,
      sex: member.user.sex,
      joinedAt: member.joinedAt?.toISOString() ?? null,
    };
  }
}
