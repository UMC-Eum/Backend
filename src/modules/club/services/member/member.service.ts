import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { AppException } from '../../../../common/errors/app.exception';
import {
  ChangeClubMemberAuthorityResponseDto,
  ClubMembersResponseDto,
  JoinClubResponseDto,
  LeaveClubResponseDto,
  PermitClubMemberResponseDto,
} from '../../dtos/member.dto';
import { MemberRepository } from '../../repositories/member.repository';

@Injectable()
export class MemberService {
  constructor(private readonly memberRepository: MemberRepository) {}

  async join(userId: bigint, clubId: bigint, _message: string): Promise<JoinClubResponseDto> {
    await this.ensureClubExists(clubId);
    const joined = await this.memberRepository.createOrRejoin(clubId, userId);
    return {
      clubUserId: Number(joined.id),
      clubId: Number(joined.clubId),
      userId: Number(joined.userId),
      authority: joined.authority,
      status: joined.status,
      joinedAt: joined.joinedAt.toISOString(),
    };
  }

  async list(clubId: bigint, me: bigint, status: ClubUserStatus, cursor?: string, limit = 30): Promise<ClubMembersResponseDto> {
    const my = await this.memberRepository.findClubUser(clubId, me);
    if (!my || my.status !== 'ACTIVE') throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');

    const result = await this.memberRepository.listMembers(clubId, status, cursor ? BigInt(cursor) : undefined, limit);

    return {
      members: result.items.map((it) => ({
        clubUserId: Number(it.id),
        userId: Number(it.userId),
        nickname: it.user.nickname,
        profileImageUrl: it.user.profileImageUrl,
        authority: it.authority,
        joinedAt: it.joinedAt.toISOString(),
        badges: it.clubUserBadges.map((b) => ({ badgeId: Number(b.badgeId), name: b.badge.name })),
      })),
      nextCursor: result.nextCursor,
    };
  }

  async leave(clubId: bigint, userId: bigint): Promise<LeaveClubResponseDto> {
    const { updated, clubDeleted } = await this.memberRepository.leaveOwn(clubId, userId);
    return { clubId: Number(updated.clubId), userId: Number(updated.userId), leftAt: (updated.leftAt ?? new Date()).toISOString(), clubDeleted };
  }

  async permit(clubId: bigint, hostId: bigint, userId: bigint, status: Extract<ClubUserStatus, 'ACTIVE' | 'REJECTED'>): Promise<PermitClubMemberResponseDto> {
    await this.ensureHost(clubId, hostId);

    const target = await this.memberRepository.findTargetMember(clubId, userId);
    if (!target) {
      throw new AppException('CLUB_MEMBER_NOT_FOUND');
    }

    if (target.leftAt || target.status !== 'PENDING') {
      throw new AppException('CLUB_INVALID_MEMBER_STATUS_TRANSITION');
    }

    const updated = await this.memberRepository.updateStatus(clubId, userId, status);
    return {
      clubUserId: Number(updated.id),
      clubId: Number(updated.clubId),
      userId: Number(updated.userId),
      status: updated.status,
      permittedAt: new Date().toISOString(),
    };
  }

  async kick(clubId: bigint, hostId: bigint, userId: bigint) {
    await this.ensureHost(clubId, hostId);
    const kicked = await this.memberRepository.kick(clubId, userId);
    return { clubId: Number(kicked.clubId), userId: Number(kicked.userId), kickedAt: (kicked.leftAt ?? new Date()).toISOString() };
  }

  async changeAuthority(clubId: bigint, hostId: bigint, userId: bigint, authority: ClubAuthority): Promise<ChangeClubMemberAuthorityResponseDto> {
    await this.ensureHost(clubId, hostId);
    const updated = await this.memberRepository.updateAuthority(clubId, userId, authority);
    return {
      clubUserId: Number(updated.id),
      clubId: Number(updated.clubId),
      userId: Number(updated.userId),
      authority: updated.authority,
      updatedAt: new Date().toISOString(),
    };
  }

  private async ensureHost(clubId: bigint, userId: bigint) {
    const me = await this.memberRepository.findClubUser(clubId, userId);
    if (!me || me.authority !== 'HOST' || me.status !== 'ACTIVE') throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
  }

  private async ensureClubExists(clubId: bigint) {
    const club = await this.memberRepository.findClub(clubId);
    if (!club || club.deletedAt) throw new AppException('CLUB_NOT_FOUND');
  }
}
