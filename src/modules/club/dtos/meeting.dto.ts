import { MeetingJoinPolicy } from '@prisma/client';

export interface CreateMeetingRequestDto {
  name: string;
  introText: string;
  date: string;
  spot: string;
  capacity: number;
  cost?: string;
  joinPolicy: MeetingJoinPolicy;
}

export interface CreateMeetingResponseDto {
  meetingId: number;
  clubId: number;
  name: string;
  introText: string;
  date: string;
  spot: string;
  capacity: number;
  cost: string | null;
  joinPolicy: MeetingJoinPolicy;
  isRegular: boolean;
  attendeeCount: number;
  createdAt: string;
}
