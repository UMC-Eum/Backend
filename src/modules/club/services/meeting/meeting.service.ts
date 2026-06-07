import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../repositories/club.repository';
import { MeetingRepository } from '../../repositories/meeting.repository';
import {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
  DeleteMeetingResponseDto,
} from '../../dtos/meeting.dto';

@Injectable()
export class MeetingService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly meetingRepository: MeetingRepository,
  ) {}

  async createMeeting(
    userId: bigint,
    clubId: bigint,
    dto: CreateMeetingRequestDto,
  ): Promise<CreateMeetingResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== userId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const created = await this.meetingRepository.create({
      clubId,
      name: dto.name,
      introText: dto.introText,
      date: dto.date,
      spot: dto.spot,
      capacity: dto.capacity,
      cost: dto.cost ?? null,
      joinPolicy: dto.joinPolicy,
    });

    return {
      meetingId: Number(created.id),
      clubId: Number(created.clubId),
      name: created.name,
      introText: created.introText,
      date: created.date,
      spot: created.spot,
      capacity: created.capacity,
      cost: created.cost,
      joinPolicy: created.joinPolicy,
      isRegular: created.isRegular,
      attendeeCount: 0,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async deleteMeeting(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
  ): Promise<DeleteMeetingResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== userId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const deletedAt = new Date();
    const deleted = await this.meetingRepository.softDeleteWithMembers(
      clubId,
      meetingId,
      deletedAt,
    );
    if (!deleted) {
      throw new AppException('MEETING_NOT_FOUND');
    }

    return {
      meetingId: Number(meetingId),
      clubId: Number(clubId),
      deletedAt: deletedAt.toISOString(),
    };
  }
}
