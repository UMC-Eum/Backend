import { Injectable } from '@nestjs/common';
import { MeetingJoinPolicy } from '@prisma/client';
import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../repositories/club.repository';
import { MeetingRepository } from '../../repositories/meeting.repository';
import {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
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

    this.validateDto(dto);

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

  private validateDto(dto: CreateMeetingRequestDto): void {
    const violations: string[] = [];
    if (!dto.name || dto.name.length > 50) violations.push('name');
    if (!dto.introText || dto.introText.length > 200)
      violations.push('introText');
    if (!dto.date || dto.date.length > 100) violations.push('date');
    if (!dto.spot) violations.push('spot');
    if (!Number.isInteger(dto.capacity) || dto.capacity <= 0)
      violations.push('capacity');
    if (dto.cost !== undefined && dto.cost.length > 50) violations.push('cost');
    if (!Object.values(MeetingJoinPolicy).includes(dto.joinPolicy))
      violations.push('joinPolicy');

    if (violations.length > 0) {
      throw new AppException('MEETING_VALIDATION_FAILED', {
        details: { fields: violations },
      });
    }
  }
}
