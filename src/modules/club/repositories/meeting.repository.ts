import { Injectable } from '@nestjs/common';
import { MeetingJoinPolicy } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    clubId: bigint;
    name: string;
    introText: string;
    date: string;
    spot: string;
    capacity: number;
    cost: string | null;
    joinPolicy: MeetingJoinPolicy;
  }) {
    return this.prisma.meeting.create({ data });
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

  async softDeleteWithMembers(
    meetingId: bigint,
    deletedAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id: meetingId },
        data: { deletedAt },
      }),
      this.prisma.meetingMember.updateMany({
        where: { meetingId, deletedAt: null },
        data: { deletedAt },
      }),
    ]);
  }
}
