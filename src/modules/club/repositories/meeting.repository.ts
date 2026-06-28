import { Injectable } from '@nestjs/common';
import { DayOfWeek, MeetingJoinPolicy, RecurrenceType } from '@prisma/client';
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
    return this.prisma.meeting.create({
      data,
      select: MEETING_DETAIL_SELECT,
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
  ): Promise<MeetingDetailRow> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data,
      select: MEETING_DETAIL_SELECT,
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
}
