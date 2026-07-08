import { Injectable } from '@nestjs/common';
import {
  ClubAuthority,
  DayOfWeek,
  MeetingJoinPolicy,
  MeetingMemberStatus,
  RecurrenceType,
} from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export type MeetingDetailRow = {
  id: bigint;
  clubId: bigint;
  name: string;
  introText: string;
  spot: string;
  capacity: number;
  cost: string | null;
  joinPolicy: MeetingJoinPolicy;
  isRegular: boolean;
  recurrenceType: RecurrenceType;
  daysOfWeek: DayOfWeek[];
  dayOfMonth: number | null;
  hour: number;
  minute: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type AttendeePreviewRow = {
  userId: bigint;
  nickname: string;
  profileImageUrl: string;
};

export type MeetingMemberRow = {
  id: bigint;
  meetingId: bigint;
  clubUserId: bigint;
  status: MeetingMemberStatus;
  requestedAt: Date;
  joinedAt: Date | null;
  deletedAt: Date | null;
};

export type PendingRequestRow = {
  meetingMemberId: bigint;
  clubUserId: bigint;
  requestedAt: Date;
  joinMessage: string;
  userId: bigint;
  nickname: string;
  profileImageUrl: string;
  authority: ClubAuthority;
};

const MEETING_MEMBER_SELECT = {
  id: true,
  meetingId: true,
  clubUserId: true,
  status: true,
  requestedAt: true,
  joinedAt: true,
  deletedAt: true,
} as const;

export type AttendeeListRow = {
  id: bigint;
  clubUserId: bigint;
  joinedAt: Date;
  userId: bigint;
  nickname: string;
  profileImageUrl: string;
  authority: ClubAuthority;
};

const MEETING_DETAIL_SELECT = {
  id: true,
  clubId: true,
  name: true,
  introText: true,
  spot: true,
  capacity: true,
  cost: true,
  joinPolicy: true,
  isRegular: true,
  recurrenceType: true,
  daysOfWeek: true,
  dayOfMonth: true,
  hour: true,
  minute: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    clubId: bigint;
    hostClubUserId: bigint;
    name: string;
    introText: string;
    spot: string;
    capacity: number;
    cost: string | null;
    joinPolicy: MeetingJoinPolicy;
    recurrenceType: RecurrenceType;
    daysOfWeek: DayOfWeek[];
    dayOfMonth: number | null;
    hour: number;
    minute: number;
  }): Promise<MeetingDetailRow> {
    const { hostClubUserId, ...meetingData } = data;
    return this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: meetingData,
        select: MEETING_DETAIL_SELECT,
      });
      await tx.meetingMember.create({
        data: {
          meetingId: meeting.id,
          clubUserId: hostClubUserId,
          status: MeetingMemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      return meeting;
    });
  }

  async findById(meetingId: bigint): Promise<{
    id: bigint;
    clubId: bigint;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, clubId: true, deletedAt: true },
    });
  }

  async findDetail(
    clubId: bigint,
    meetingId: bigint,
  ): Promise<MeetingDetailRow | null> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, clubId, deletedAt: null },
      select: MEETING_DETAIL_SELECT,
    });
    return meeting ?? null;
  }

  async update(
    clubId: bigint,
    meetingId: bigint,
    data: {
      name?: string;
      introText?: string;
      spot?: string;
      capacity?: number;
      cost?: string | null;
      joinPolicy?: MeetingJoinPolicy;
      recurrenceType?: RecurrenceType;
      daysOfWeek?: DayOfWeek[];
      dayOfMonth?: number | null;
      hour?: number;
      minute?: number;
    },
  ): Promise<{
    meeting: MeetingDetailRow | null;
    capacityBelowAttendees: boolean;
    meetingMissing: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: bigint; deletedAt: Date | null }>
      >`SELECT id, "deletedAt" FROM "Meeting" WHERE id = ${meetingId} AND "clubId" = ${clubId} FOR UPDATE`;
      if (rows.length === 0 || rows[0].deletedAt !== null) {
        return {
          meeting: null,
          capacityBelowAttendees: false,
          meetingMissing: true,
        };
      }

      if (data.capacity !== undefined) {
        const count = await tx.meetingMember.count({
          where: {
            meetingId,
            deletedAt: null,
            status: MeetingMemberStatus.ACTIVE,
          },
        });
        if (data.capacity < count) {
          return {
            meeting: null,
            capacityBelowAttendees: true,
            meetingMissing: false,
          };
        }
      }
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data,
        select: MEETING_DETAIL_SELECT,
      });
      return {
        meeting,
        capacityBelowAttendees: false,
        meetingMissing: false,
      };
    });
  }

  async countAttendees(meetingId: bigint): Promise<number> {
    return this.prisma.meetingMember.count({
      where: {
        meetingId,
        deletedAt: null,
        status: MeetingMemberStatus.ACTIVE,
      },
    });
  }

  async findAttendeesPreview(
    meetingId: bigint,
    limit: number,
  ): Promise<AttendeePreviewRow[]> {
    const rows = await this.prisma.meetingMember.findMany({
      where: {
        meetingId,
        deletedAt: null,
        status: MeetingMemberStatus.ACTIVE,
      },
      take: limit,
      orderBy: { joinedAt: 'asc' },
      select: {
        clubUser: {
          select: {
            user: {
              select: { id: true, nickname: true, profileImageUrl: true },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      userId: r.clubUser.user.id,
      nickname: r.clubUser.user.nickname,
      profileImageUrl: r.clubUser.user.profileImageUrl,
    }));
  }

  async isAttending(meetingId: bigint, clubUserId: bigint): Promise<boolean> {
    const count = await this.prisma.meetingMember.count({
      where: {
        meetingId,
        clubUserId,
        deletedAt: null,
        status: MeetingMemberStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  async softDeleteWithMembers(
    clubId: bigint,
    meetingId: bigint,
    deletedAt: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.meeting.updateMany({
        where: { id: meetingId, clubId, deletedAt: null },
        data: { deletedAt },
      });

      if (result.count === 0) {
        return false;
      }

      await tx.meetingMember.updateMany({
        where: { meetingId, deletedAt: null },
        data: { deletedAt },
      });

      return true;
    });
  }

  async findMemberByMeetingAndClubUser(
    meetingId: bigint,
    clubUserId: bigint,
  ): Promise<MeetingMemberRow | null> {
    return this.prisma.meetingMember.findUnique({
      where: { meetingId_clubUserId: { meetingId, clubUserId } },
      select: MEETING_MEMBER_SELECT,
    });
  }

  async joinMeeting(
    clubId: bigint,
    meetingId: bigint,
    clubUserId: bigint,
  ): Promise<{
    member: MeetingMemberRow | null;
    capacityExceeded: boolean;
    meetingMissing: boolean;
    alreadyJoined: boolean;
    alreadyRequested: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: bigint;
          capacity: number;
          joinPolicy: MeetingJoinPolicy;
          deletedAt: Date | null;
        }>
      >`SELECT id, capacity, "joinPolicy", "deletedAt" FROM "Meeting" WHERE id = ${meetingId} AND "clubId" = ${clubId} FOR UPDATE`;

      if (rows.length === 0 || rows[0].deletedAt !== null) {
        return {
          member: null,
          capacityExceeded: false,
          meetingMissing: true,
          alreadyJoined: false,
          alreadyRequested: false,
        };
      }
      const isApproval =
        rows[0].joinPolicy === MeetingJoinPolicy.APPROVAL_REQUIRED;
      const capacity = rows[0].capacity;

      const existing = await tx.meetingMember.findUnique({
        where: { meetingId_clubUserId: { meetingId, clubUserId } },
        select: { id: true, status: true, deletedAt: true },
      });
      // 이미 참석중이거나 승인 대기중이면 중복 처리 (REJECTED/취소 이력은 재신청 허용)
      if (existing && existing.deletedAt === null) {
        if (existing.status === MeetingMemberStatus.ACTIVE) {
          return {
            member: null,
            capacityExceeded: false,
            meetingMissing: false,
            alreadyJoined: true,
            alreadyRequested: false,
          };
        }
        if (existing.status === MeetingMemberStatus.PENDING) {
          return {
            member: null,
            capacityExceeded: false,
            meetingMissing: false,
            alreadyJoined: false,
            alreadyRequested: true,
          };
        }
      }

      const now = new Date();

      // 승인정모: 정원체크 없이 PENDING 신청 생성 (승인 시점에만 정원 확인)
      if (isApproval) {
        const member = await tx.meetingMember.upsert({
          where: { meetingId_clubUserId: { meetingId, clubUserId } },
          create: {
            meetingId,
            clubUserId,
            status: MeetingMemberStatus.PENDING,
            requestedAt: now,
            joinedAt: null,
          },
          update: {
            status: MeetingMemberStatus.PENDING,
            requestedAt: now,
            joinedAt: null,
            deletedAt: null,
          },
          select: MEETING_MEMBER_SELECT,
        });
        return {
          member,
          capacityExceeded: false,
          meetingMissing: false,
          alreadyJoined: false,
          alreadyRequested: false,
        };
      }

      // 자유참석(AUTO): 정원(ACTIVE 수) 확인 후 즉시 참석 확정
      const count = await tx.meetingMember.count({
        where: {
          meetingId,
          deletedAt: null,
          status: MeetingMemberStatus.ACTIVE,
        },
      });
      if (count >= capacity) {
        return {
          member: null,
          capacityExceeded: true,
          meetingMissing: false,
          alreadyJoined: false,
          alreadyRequested: false,
        };
      }
      const member = await tx.meetingMember.upsert({
        where: { meetingId_clubUserId: { meetingId, clubUserId } },
        create: {
          meetingId,
          clubUserId,
          status: MeetingMemberStatus.ACTIVE,
          requestedAt: now,
          joinedAt: now,
        },
        update: {
          status: MeetingMemberStatus.ACTIVE,
          joinedAt: now,
          deletedAt: null,
        },
        select: MEETING_MEMBER_SELECT,
      });
      return {
        member,
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: false,
        alreadyRequested: false,
      };
    });
  }

  async leaveMeeting(
    clubId: bigint,
    meetingId: bigint,
    clubUserId: bigint,
    deletedAt: Date,
  ): Promise<number> {
    const result = await this.prisma.meetingMember.updateMany({
      where: {
        meetingId,
        clubUserId,
        deletedAt: null,
        meeting: { clubId },
      },
      data: { deletedAt },
    });
    return result.count;
  }

  async listActiveMembers(
    clubId: bigint,
    meetingId: bigint,
    cursor: { joinedAt: Date; id: bigint } | null,
    take: number,
  ): Promise<AttendeeListRow[]> {
    const rows = await this.prisma.meetingMember.findMany({
      where: {
        meetingId,
        deletedAt: null,
        status: MeetingMemberStatus.ACTIVE,
        meeting: { clubId },
        ...(cursor
          ? {
              OR: [
                { joinedAt: { gt: cursor.joinedAt } },
                {
                  joinedAt: cursor.joinedAt,
                  id: { gt: cursor.id },
                },
              ],
            }
          : {}),
      },
      take,
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        clubUserId: true,
        joinedAt: true,
        clubUser: {
          select: {
            authority: true,
            user: {
              select: { id: true, nickname: true, profileImageUrl: true },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      clubUserId: r.clubUserId,
      // ACTIVE 참석자는 항상 joinedAt이 존재 (승인/참석 확정 시 세팅)
      joinedAt: r.joinedAt as Date,
      userId: r.clubUser.user.id,
      nickname: r.clubUser.user.nickname,
      profileImageUrl: r.clubUser.user.profileImageUrl,
      authority: r.clubUser.authority,
    }));
  }

  async listPendingRequests(
    clubId: bigint,
    meetingId: bigint,
  ): Promise<PendingRequestRow[]> {
    const rows = await this.prisma.meetingMember.findMany({
      where: {
        meetingId,
        deletedAt: null,
        status: MeetingMemberStatus.PENDING,
        meeting: { clubId },
      },
      orderBy: { requestedAt: 'asc' },
      select: {
        id: true,
        clubUserId: true,
        requestedAt: true,
        joinMessage: true,
        clubUser: {
          select: {
            authority: true,
            user: {
              select: { id: true, nickname: true, profileImageUrl: true },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      meetingMemberId: r.id,
      clubUserId: r.clubUserId,
      requestedAt: r.requestedAt,
      joinMessage: r.joinMessage,
      userId: r.clubUser.user.id,
      nickname: r.clubUser.user.nickname,
      profileImageUrl: r.clubUser.user.profileImageUrl,
      authority: r.clubUser.authority,
    }));
  }

  async processPendingStatusWithCapacity(params: {
    clubId: bigint;
    meetingId: bigint;
    targetClubUserId: bigint;
    status: MeetingMemberStatus;
    capacity: number;
  }): Promise<
    | { result: 'not_found' }
    | { result: 'capacity_exceeded' }
    | { result: 'updated'; member: MeetingMemberRow }
  > {
    const { clubId, meetingId, targetClubUserId, status, capacity } = params;
    return this.prisma.$transaction(async (tx) => {
      // 정원 경합 방지: 정모가 속한 클럽/정모를 잠근다
      const meetings = await tx.$queryRaw<
        Array<{ id: bigint; deletedAt: Date | null }>
      >`SELECT id, "deletedAt" FROM "Meeting" WHERE id = ${meetingId} AND "clubId" = ${clubId} FOR UPDATE`;
      if (meetings.length === 0 || meetings[0].deletedAt !== null) {
        return { result: 'not_found' as const };
      }

      const pending = await tx.meetingMember.findFirst({
        where: {
          meetingId,
          clubUserId: targetClubUserId,
          deletedAt: null,
          status: MeetingMemberStatus.PENDING,
        },
        select: { id: true },
      });
      if (!pending) {
        return { result: 'not_found' as const };
      }

      // 승인 시에만 정원(ACTIVE 수) 확인
      if (status === MeetingMemberStatus.ACTIVE) {
        const activeCount = await tx.meetingMember.count({
          where: {
            meetingId,
            deletedAt: null,
            status: MeetingMemberStatus.ACTIVE,
          },
        });
        if (activeCount >= capacity) {
          return { result: 'capacity_exceeded' as const };
        }
      }

      const member = await tx.meetingMember.update({
        where: { id: pending.id },
        data: {
          status,
          joinedAt: status === MeetingMemberStatus.ACTIVE ? new Date() : null,
        },
        select: MEETING_MEMBER_SELECT,
      });
      return { result: 'updated' as const, member };
    });
  }
}
