import { Injectable } from '@nestjs/common';
import {
  ClubAuthority,
  DayOfWeek,
  MeetingJoinPolicy,
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
  joinedAt: Date;
  deletedAt: Date | null;
};

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
        data: { meetingId: meeting.id, clubUserId: hostClubUserId },
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
      >`SELECT id, "deletedAt" FROM "Meeting" WHERE id = ${meetingId} FOR UPDATE`;
      if (rows.length === 0 || rows[0].deletedAt !== null) {
        return {
          meeting: null,
          capacityBelowAttendees: false,
          meetingMissing: true,
        };
      }

      if (data.capacity !== undefined) {
        const count = await tx.meetingMember.count({
          where: { meetingId, deletedAt: null },
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
      where: { meetingId, deletedAt: null },
    });
  }

  async findAttendeesPreview(
    meetingId: bigint,
    limit: number,
  ): Promise<AttendeePreviewRow[]> {
    const rows = await this.prisma.meetingMember.findMany({
      where: { meetingId, deletedAt: null },
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
      where: { meetingId, clubUserId, deletedAt: null },
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
      select: {
        id: true,
        meetingId: true,
        clubUserId: true,
        joinedAt: true,
        deletedAt: true,
      },
    });
  }

  async joinMeeting(
    meetingId: bigint,
    clubUserId: bigint,
  ): Promise<{
    member: MeetingMemberRow | null;
    capacityExceeded: boolean;
    meetingMissing: boolean;
    alreadyJoined: boolean;
    approvalRequired: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: bigint;
          capacity: number;
          joinPolicy: MeetingJoinPolicy;
          deletedAt: Date | null;
        }>
      >`SELECT id, capacity, "joinPolicy", "deletedAt" FROM "Meeting" WHERE id = ${meetingId} FOR UPDATE`;

      if (rows.length === 0 || rows[0].deletedAt !== null) {
        return {
          member: null,
          capacityExceeded: false,
          meetingMissing: true,
          alreadyJoined: false,
          approvalRequired: false,
        };
      }
      if (rows[0].joinPolicy === MeetingJoinPolicy.APPROVAL_REQUIRED) {
        return {
          member: null,
          capacityExceeded: false,
          meetingMissing: false,
          alreadyJoined: false,
          approvalRequired: true,
        };
      }
      const capacity = rows[0].capacity;

      const existing = await tx.meetingMember.findUnique({
        where: { meetingId_clubUserId: { meetingId, clubUserId } },
        select: { id: true, deletedAt: true },
      });
      if (existing && existing.deletedAt === null) {
        return {
          member: null,
          capacityExceeded: false,
          meetingMissing: false,
          alreadyJoined: true,
          approvalRequired: false,
        };
      }

      const count = await tx.meetingMember.count({
        where: { meetingId, deletedAt: null },
      });
      if (count >= capacity) {
        return {
          member: null,
          capacityExceeded: true,
          meetingMissing: false,
          alreadyJoined: false,
          approvalRequired: false,
        };
      }
      const joinedAt = new Date();
      const member = await tx.meetingMember.upsert({
        where: { meetingId_clubUserId: { meetingId, clubUserId } },
        create: { meetingId, clubUserId, joinedAt },
        update: { deletedAt: null, joinedAt },
        select: {
          id: true,
          meetingId: true,
          clubUserId: true,
          joinedAt: true,
          deletedAt: true,
        },
      });
      return {
        member,
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: false,
        approvalRequired: false,
      };
    });
  }

  async leaveMeeting(
    meetingId: bigint,
    clubUserId: bigint,
    deletedAt: Date,
  ): Promise<number> {
    const result = await this.prisma.meetingMember.updateMany({
      where: { meetingId, clubUserId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count;
  }

  async listActiveMembers(
    meetingId: bigint,
    cursor: { joinedAt: Date; id: bigint } | null,
    take: number,
  ): Promise<AttendeeListRow[]> {
    const rows = await this.prisma.meetingMember.findMany({
      where: {
        meetingId,
        deletedAt: null,
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
      joinedAt: r.joinedAt,
      userId: r.clubUser.user.id,
      nickname: r.clubUser.user.nickname,
      profileImageUrl: r.clubUser.user.profileImageUrl,
      authority: r.clubUser.authority,
    }));
  }
}
