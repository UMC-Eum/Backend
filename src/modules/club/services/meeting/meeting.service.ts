import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { toKstIso } from '../../../../common/utils/datetime.util';
import { ClubRepository } from '../../repositories/club.repository';
import {
  AttendeePreviewRow,
  MeetingDetailRow,
  MeetingRepository,
} from '../../repositories/meeting.repository';
import {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
  DeleteMeetingResponseDto,
  GetMeetingDetailResponseDto,
  UpdateMeetingRequestDto,
  UpdateMeetingResponseDto,
} from '../../dtos/meeting.dto';
import {
  computeNextOccurrenceKst,
  formatDateLabel,
  Recurrence,
} from '../../utils/recurrence.util';

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

    const { recurrence } = dto;
    const created = await this.meetingRepository.create({
      clubId,
      name: dto.name,
      introText: dto.introText,
      spot: dto.spot,
      capacity: dto.capacity,
      cost: dto.cost ?? null,
      joinPolicy: dto.joinPolicy,
      recurrenceType: recurrence.type,
      daysOfWeek: recurrence.daysOfWeek ?? [],
      dayOfMonth: recurrence.dayOfMonth ?? null,
      hour: recurrence.hour,
      minute: recurrence.minute,
    });

    return this.buildMeetingDetail(created, 0, [], false);
  }

  async getMeetingDetail(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
  ): Promise<GetMeetingDetailResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const clubUser = await this.clubRepository.findActiveClubUser(
      userId,
      clubId,
    );
    if (!clubUser) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    const meeting = await this.meetingRepository.findDetail(clubId, meetingId);
    if (!meeting) {
      throw new AppException('MEETING_NOT_FOUND');
    }

    const [attendeeCount, attendeesPreview, isAttending] = await Promise.all([
      this.meetingRepository.countAttendees(meetingId),
      this.meetingRepository.findAttendeesPreview(meetingId, 4),
      this.meetingRepository.isAttending(meetingId, clubUser.id),
    ]);

    return this.buildMeetingDetail(
      meeting,
      attendeeCount,
      attendeesPreview,
      isAttending,
    );
  }

  async updateMeeting(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
    dto: UpdateMeetingRequestDto,
  ): Promise<UpdateMeetingResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== userId) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const existing = await this.meetingRepository.findDetail(clubId, meetingId);
    if (!existing) {
      throw new AppException('MEETING_NOT_FOUND');
    }

    if (dto.capacity !== undefined) {
      const currentAttendees =
        await this.meetingRepository.countAttendees(meetingId);
      if (dto.capacity < currentAttendees) {
        throw new AppException('MEETING_CAPACITY_BELOW_ATTENDEES');
      }
    }

    const { recurrence } = dto;

    const updated = await this.meetingRepository.update(meetingId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.introText !== undefined ? { introText: dto.introText } : {}),
      ...(dto.spot !== undefined ? { spot: dto.spot } : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.cost !== undefined ? { cost: dto.cost ?? null } : {}),
      ...(dto.joinPolicy !== undefined ? { joinPolicy: dto.joinPolicy } : {}),
      ...(recurrence
        ? {
            recurrenceType: recurrence.type,
            daysOfWeek: recurrence.daysOfWeek ?? [],
            dayOfMonth: recurrence.dayOfMonth ?? null,
            hour: recurrence.hour,
            minute: recurrence.minute,
          }
        : {}),
    });

    const [attendeeCount, attendeesPreview, clubUser] = await Promise.all([
      this.meetingRepository.countAttendees(meetingId),
      this.meetingRepository.findAttendeesPreview(meetingId, 4),
      this.clubRepository.findActiveClubUser(userId, clubId),
    ]);
    const isAttending = clubUser
      ? await this.meetingRepository.isAttending(meetingId, clubUser.id)
      : false;

    return this.buildMeetingDetail(
      updated,
      attendeeCount,
      attendeesPreview,
      isAttending,
    );
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
      deletedAt: toKstIso(deletedAt),
    };
  }

  private buildMeetingDetail(
    meeting: MeetingDetailRow,
    attendeeCount: number,
    attendeesPreview: AttendeePreviewRow[],
    isAttending: boolean,
  ): GetMeetingDetailResponseDto {
    const recurrence: Recurrence = {
      type: meeting.recurrenceType,
      daysOfWeek: meeting.daysOfWeek,
      dayOfMonth: meeting.dayOfMonth,
      hour: meeting.hour,
      minute: meeting.minute,
    };
    const nextOccurrence = computeNextOccurrenceKst(recurrence, new Date());

    return {
      meetingId: Number(meeting.id),
      clubId: Number(meeting.clubId),
      name: meeting.name,
      introText: meeting.introText,
      spot: meeting.spot,
      cost: meeting.cost,
      capacity: meeting.capacity,
      attendeeCount,
      joinPolicy: meeting.joinPolicy,
      isRegular: meeting.isRegular,
      isAttending,
      recurrence: {
        type: meeting.recurrenceType,
        daysOfWeek:
          meeting.recurrenceType === 'WEEKLY' ? meeting.daysOfWeek : null,
        dayOfMonth: meeting.dayOfMonth,
        hour: meeting.hour,
        minute: meeting.minute,
      },
      dateLabel: formatDateLabel(recurrence),
      nextOccurrenceAt: toKstIso(nextOccurrence),
      attendeesPreview: attendeesPreview.map((a) => ({
        userId: Number(a.userId),
        nickname: a.nickname,
        profileImageUrl: a.profileImageUrl,
      })),
      createdAt: toKstIso(meeting.createdAt),
      updatedAt: meeting.updatedAt ? toKstIso(meeting.updatedAt) : null,
    };
  }
}
