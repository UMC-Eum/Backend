import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { toKstIso } from '../../../../common/utils/datetime.util';
import { encodeCursor } from '../../../../common/utils/cursor.util';
import { ClubRepository } from '../../repositories/club.repository';
import {
  AttendeeListRow,
  AttendeePreviewRow,
  MeetingDetailRow,
  MeetingRepository,
} from '../../repositories/meeting.repository';
import {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
  DeleteMeetingResponseDto,
  GetMeetingDetailResponseDto,
  JoinMeetingResponseDto,
  LeaveMeetingResponseDto,
  ListAttendeesQueryDto,
  ListAttendeesResponseDto,
  UpdateMeetingRequestDto,
  UpdateMeetingResponseDto,
} from '../../dtos/meeting.dto';
import {
  computeNextOccurrenceKst,
  formatDateLabel,
  Recurrence,
} from '../../utils/recurrence.util';
import { decodeAttendeesCursor } from '../../utils/cursor.util';

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

    const hostClubUser = await this.clubRepository.findActiveClubUser(
      userId,
      clubId,
    );
    if (!hostClubUser) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    const { recurrence } = dto;
    const created = await this.meetingRepository.create({
      clubId,
      hostClubUserId: hostClubUser.id,
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

    const hostPreview = await this.meetingRepository.findAttendeesPreview(
      created.id,
      4,
    );
    return this.buildMeetingDetail(created, 1, hostPreview, true);
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

    const { recurrence } = dto;

    const {
      meeting: updated,
      capacityBelowAttendees,
      meetingMissing,
    } = await this.meetingRepository.update(clubId, meetingId, {
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
    if (meetingMissing) {
      throw new AppException('MEETING_NOT_FOUND');
    }
    if (capacityBelowAttendees) {
      throw new AppException('MEETING_CAPACITY_BELOW_ATTENDEES');
    }
    if (!updated) {
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

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

  async joinMeeting(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
  ): Promise<JoinMeetingResponseDto> {
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

    const {
      member,
      capacityExceeded,
      meetingMissing,
      alreadyJoined,
      approvalRequired,
    } = await this.meetingRepository.joinMeeting(
      clubId,
      meetingId,
      clubUser.id,
    );
    if (meetingMissing) {
      throw new AppException('MEETING_NOT_FOUND');
    }
    if (approvalRequired) {
      throw new AppException('MEETING_APPROVAL_NOT_SUPPORTED');
    }
    if (alreadyJoined) {
      throw new AppException('MEETING_ALREADY_JOINED');
    }
    if (capacityExceeded) {
      throw new AppException('MEETING_CAPACITY_EXCEEDED');
    }
    if (!member) {
      throw new AppException('SERVER_TEMPORARY_ERROR');
    }

    return {
      meetingMemberId: Number(member.id),
      meetingId: Number(member.meetingId),
      clubUserId: Number(member.clubUserId),
      userId: Number(userId),
      joinedAt: toKstIso(member.joinedAt),
    };
  }

  async leaveMeeting(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
  ): Promise<LeaveMeetingResponseDto> {
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    if (club.hostId === userId) {
      throw new AppException('MEETING_HOST_CANNOT_LEAVE');
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

    const deletedAt = new Date();
    const affected = await this.meetingRepository.leaveMeeting(
      clubId,
      meetingId,
      clubUser.id,
      deletedAt,
    );
    if (affected === 0) {
      throw new AppException('MEETING_NOT_JOINED');
    }

    return {
      meetingId: Number(meetingId),
      userId: Number(userId),
      canceledAt: toKstIso(deletedAt),
    };
  }

  async listAttendees(
    userId: bigint,
    clubId: bigint,
    meetingId: bigint,
    query: ListAttendeesQueryDto,
  ): Promise<ListAttendeesResponseDto> {
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

    const size = query.size ?? 30;
    const cursor = query.cursor ? decodeAttendeesCursor(query.cursor) : null;

    const [attendeeCount, rows] = await Promise.all([
      this.meetingRepository.countAttendees(meetingId),
      this.meetingRepository.listActiveMembers(
        clubId,
        meetingId,
        cursor,
        size + 1,
      ),
    ]);

    const hasMore = rows.length > size;
    const page = hasMore ? rows.slice(0, size) : rows;

    const nextCursor =
      hasMore && page.length > 0
        ? encodeCursor({
            joinedAt: page[page.length - 1].joinedAt.toISOString(),
            id: page[page.length - 1].id.toString(),
          })
        : null;

    return {
      meetingId: Number(meetingId),
      attendeeCount,
      attendees: page.map((row) => this.buildAttendeeItem(row)),
      nextCursor,
      hasMore,
    };
  }

  private buildAttendeeItem(row: AttendeeListRow) {
    return {
      meetingMemberId: Number(row.id),
      clubUserId: Number(row.clubUserId),
      user: {
        userId: Number(row.userId),
        nickname: row.nickname,
        profileImageUrl: row.profileImageUrl,
        authority: row.authority,
      },
      joinedAt: toKstIso(row.joinedAt),
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
