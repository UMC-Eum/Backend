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
}
