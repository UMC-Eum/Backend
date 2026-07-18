import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ClubAuthority,
  ClubUser,
  ClubUserStatus,
  NotificationType,
} from '@prisma/client';
import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../repositories/club.repository';
import { ClubMemberRepository } from '../../repositories/club-member.repository';
import { NotificationService } from '../../../notification/services/notification.service';
import {
  CLUB_MEMBER_REMOVED,
  ClubMemberRemovedEvent,
} from '../../events/club-member-removed.event';
import {
  ClubMemberListItemDto,
  ClubMemberListResponseDto,
  ClubMemberRequestListResponseDto,
  ClubMemberRequestItemDto,
  ClubMemberResponseDto,
  CreateClubMemberRequestDto,
  LeaveClubMemberResponseDto,
  UpdateClubMemberAuthorityRequestDto,
  UpdateClubMemberStatusRequestDto,
} from '../../dtos/club-member.dto';

@Injectable()
export class ClubMemberService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly clubMemberRepository: ClubMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
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
      await this.createJoinRequestNotification(club, userId);
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
      await this.createJoinRequestNotification(club, userId);
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

    const result =
      await this.clubMemberRepository.processPendingStatusWithCapacity({
        clubId,
        userId: targetUserId,
        status: dto.status,
        capacity: club.capacity,
      });
    if (result.result === 'not_found') {
      throw new AppException('CLUB_MEMBER_REQUEST_NOT_FOUND');
    }
    if (result.result === 'capacity_exceeded') {
      throw new AppException('CLUB_CAPACITY_EXCEEDED');
    }

    await this.createJoinRequestStatusNotification(
      club,
      hostUserId,
      targetUserId,
      dto.status,
    );

    return this.toResponse(result.member);
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

    // 트랜잭션 커밋 이후 발행 → chat 도메인이 실시간 소켓 룸에서 퇴출
    this.eventEmitter.emit(
      CLUB_MEMBER_REMOVED,
      new ClubMemberRemovedEvent(clubId, userId),
    );

    return {
      clubUserId: Number(left.id),
      clubId: Number(left.clubId),
      userId: Number(left.userId),
      status: left.status,
      leftAt: left.leftAt.toISOString(),
    };
  }

  async kick(
    hostUserId: bigint,
    clubId: bigint,
    targetUserId: bigint,
  ): Promise<LeaveClubMemberResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== hostUserId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }
    if (hostUserId === targetUserId) {
      throw new AppException('CLUB_HOST_KICK_FORBIDDEN');
    }

    const member = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      targetUserId,
    );
    if (!member || member.status !== ClubUserStatus.ACTIVE) {
      throw new AppException('CLUB_MEMBER_NOT_FOUND');
    }

    const kicked = await this.clubMemberRepository.kick(clubId, targetUserId);
    if (!kicked.leftAt) {
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    // 트랜잭션 커밋 이후 발행 → chat 도메인이 실시간 소켓 룸에서 퇴출
    this.eventEmitter.emit(
      CLUB_MEMBER_REMOVED,
      new ClubMemberRemovedEvent(clubId, targetUserId),
    );

    return {
      clubUserId: Number(kicked.id),
      clubId: Number(kicked.clubId),
      userId: Number(kicked.userId),
      status: kicked.status,
      leftAt: kicked.leftAt.toISOString(),
    };
  }

  async updateAuthority(
    hostUserId: bigint,
    clubId: bigint,
    targetUserId: bigint,
    dto: UpdateClubMemberAuthorityRequestDto,
  ): Promise<ClubMemberResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== hostUserId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    if (dto.authority === ClubAuthority.GENERAL) {
      throw new AppException('CLUB_HOST_AUTHORITY_REQUIRED');
    }

    const member = await this.clubMemberRepository.findByClubAndUser(
      clubId,
      targetUserId,
    );
    if (!member || member.status !== ClubUserStatus.ACTIVE) {
      throw new AppException('CLUB_MEMBER_NOT_FOUND');
    }

    if (member.authority === ClubAuthority.HOST) {
      return this.toResponse(member);
    }

    const updated = await this.clubMemberRepository.delegateHost({
      clubId,
      currentHostUserId: hostUserId,
      nextHostUserId: targetUserId,
    });

    return this.toResponse(updated);
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

  private async createJoinRequestNotification(
    club: { id: bigint; hostId: bigint | null; name: string },
    requesterUserId: bigint,
  ): Promise<void> {
    if (!club.hostId || club.hostId === requesterUserId) {
      return;
    }

    await this.notificationService.createNotification(
      Number(club.hostId),
      NotificationType.CLUB,
      '새 동호회 가입 신청이 있어요.',
      `[${club.name}] 새 가입 신청이 도착했어요.`,
      Number(requesterUserId),
      {
        clubId: club.id.toString(),
        senderUserId: requesterUserId.toString(),
      },
    );
  }

  private async createJoinRequestStatusNotification(
    club: { id: bigint; name: string },
    hostUserId: bigint,
    targetUserId: bigint,
    status: ClubUserStatus,
  ): Promise<void> {
    const approved = status === ClubUserStatus.ACTIVE;

    await this.notificationService.createNotification(
      Number(targetUserId),
      NotificationType.CLUB,
      approved ? '동호회 가입이 승인됐어요.' : '동호회 가입 신청이 거절됐어요.',
      approved
        ? `[${club.name}] 동호회 가입이 승인됐어요.`
        : `[${club.name}] 동호회 가입 신청이 거절됐어요.`,
      Number(hostUserId),
      {
        clubId: club.id.toString(),
        senderUserId: hostUserId.toString(),
        status,
      },
    );
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
