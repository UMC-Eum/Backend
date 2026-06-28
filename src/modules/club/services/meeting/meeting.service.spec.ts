import { Test, TestingModule } from '@nestjs/testing';
import { DayOfWeek, MeetingJoinPolicy, RecurrenceType } from '@prisma/client';
import { MeetingService } from './meeting.service';
import { ClubRepository } from '../../repositories/club.repository';
import {
  MeetingDetailRow,
  MeetingRepository,
} from '../../repositories/meeting.repository';
import { AppException } from '../../../../common/errors/app.exception';
import {
  CreateMeetingRequestDto,
  UpdateMeetingRequestDto,
} from '../../dtos/meeting.dto';

describe('MeetingService', () => {
  let service: MeetingService;
  const findById = jest.fn();
  const findActiveClubUser = jest.fn();
  const create = jest.fn();
  const findDetail = jest.fn();
  const update = jest.fn();
  const countAttendees = jest.fn();
  const findAttendeesPreview = jest.fn();
  const isAttending = jest.fn();
  const softDeleteWithMembers = jest.fn();

  const validDto: CreateMeetingRequestDto = {
    name: '매주하는 새벽등산',
    introText: '함께 새벽 산행할 분들 모집',
    spot: '종로역 1번 출구 앞',
    capacity: 15,
    cost: '1인 10000원',
    joinPolicy: MeetingJoinPolicy.AUTO,
    recurrence: {
      type: RecurrenceType.WEEKLY,
      daysOfWeek: [DayOfWeek.THU],
      hour: 19,
      minute: 0,
    },
  };

  const hostUserId = 100n;
  const clubId = 7n;
  const meetingId = 88n;

  const baseMeetingRow: MeetingDetailRow = {
    id: meetingId,
    clubId,
    name: validDto.name,
    introText: validDto.introText,
    spot: validDto.spot,
    capacity: validDto.capacity,
    cost: validDto.cost ?? null,
    joinPolicy: validDto.joinPolicy,
    isRegular: true,
    recurrenceType: RecurrenceType.WEEKLY,
    daysOfWeek: [DayOfWeek.THU],
    dayOfMonth: null,
    hour: 19,
    minute: 0,
    createdAt: new Date('2026-05-17T01:00:00.000Z'),
    updatedAt: null,
    deletedAt: null,
  };

  beforeEach(async () => {
    [
      findById,
      findActiveClubUser,
      create,
      findDetail,
      update,
      countAttendees,
      findAttendeesPreview,
      isAttending,
      softDeleteWithMembers,
    ].forEach((fn) => fn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        {
          provide: ClubRepository,
          useValue: { findById, findActiveClubUser },
        },
        {
          provide: MeetingRepository,
          useValue: {
            create,
            findDetail,
            update,
            countAttendees,
            findAttendeesPreview,
            isAttending,
            softDeleteWithMembers,
          },
        },
      ],
    }).compile();

    service = module.get<MeetingService>(MeetingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeeting', () => {
    it('호스트가 만들면 정모가 생성된다', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      create.mockResolvedValue(baseMeetingRow);

      const result = await service.createMeeting(hostUserId, clubId, validDto);

      expect(result.meetingId).toBe(Number(meetingId));
      expect(result.clubId).toBe(Number(clubId));
      expect(result.attendeeCount).toBe(0);
      expect(result.dateLabel).toBe('매주 목요일 오후 7시');
      expect(result.recurrence.type).toBe(RecurrenceType.WEEKLY);
      expect(result.recurrence.daysOfWeek).toEqual([DayOfWeek.THU]);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: 999n,
        deletedAt: null,
      });

      await expect(
        service.createMeeting(hostUserId, clubId, validDto),
      ).rejects.toMatchObject({
        internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
      } satisfies Partial<AppException>);
      expect(create).not.toHaveBeenCalled();
    });

    it('클럽이 없으면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue(null);
      await expect(
        service.createMeeting(hostUserId, clubId, validDto),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    });

    it('soft-deleted 클럽이면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: new Date(),
      });
      await expect(
        service.createMeeting(hostUserId, clubId, validDto),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    });
  });

  describe('getMeetingDetail', () => {
    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findActiveClubUser.mockResolvedValue({ id: 555n });
      findDetail.mockResolvedValue(baseMeetingRow);
      countAttendees.mockResolvedValue(4);
      findAttendeesPreview.mockResolvedValue([
        { userId: 42n, nickname: '루씨', profileImageUrl: 'u1' },
        { userId: 88n, nickname: '성현', profileImageUrl: 'u2' },
      ]);
      isAttending.mockResolvedValue(true);
    });

    it('가입자가 호출하면 상세를 돌려준다', async () => {
      const result = await service.getMeetingDetail(
        hostUserId,
        clubId,
        meetingId,
      );

      expect(result.attendeeCount).toBe(4);
      expect(result.isAttending).toBe(true);
      expect(result.attendeesPreview).toHaveLength(2);
      expect(result.attendeesPreview[0]).toEqual({
        userId: 42,
        nickname: '루씨',
        profileImageUrl: 'u1',
      });
      expect(result.dateLabel).toBe('매주 목요일 오후 7시');
      expect(result.nextOccurrenceAt).toMatch(/T19:00:00\+09:00$/);
      expect(result.createdAt).toMatch(/\+09:00$/);
    });

    it('클럽이 없으면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue(null);
      await expect(
        service.getMeetingDetail(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    });

    it('가입자가 아니면 CLUB_FORBIDDEN_NOT_MEMBER', async () => {
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.getMeetingDetail(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER',
      });
      expect(findDetail).not.toHaveBeenCalled();
    });

    it('정모가 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.getMeetingDetail(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });

  describe('updateMeeting', () => {
    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findDetail.mockResolvedValue(baseMeetingRow);
      countAttendees.mockResolvedValue(4);
      findAttendeesPreview.mockResolvedValue([]);
      findActiveClubUser.mockResolvedValue({ id: 555n });
      isAttending.mockResolvedValue(false);
    });

    it('호스트가 recurrence를 변경하면 dateLabel이 갱신된다', async () => {
      const dto: UpdateMeetingRequestDto = {
        recurrence: {
          type: RecurrenceType.DAILY,
          hour: 7,
          minute: 0,
        },
      };
      update.mockResolvedValue({
        ...baseMeetingRow,
        recurrenceType: RecurrenceType.DAILY,
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 7,
        minute: 0,
        updatedAt: new Date(),
      });

      const result = await service.updateMeeting(
        hostUserId,
        clubId,
        meetingId,
        dto,
      );

      expect(update).toHaveBeenCalledWith(
        meetingId,
        expect.objectContaining({
          recurrenceType: RecurrenceType.DAILY,
          daysOfWeek: [],
          dayOfMonth: null,
          hour: 7,
          minute: 0,
        }),
      );
      expect(result.dateLabel).toBe('매일 오전 7시');
      expect(result.recurrence.daysOfWeek).toBeNull();
    });

    it('capacity가 현재 참석자 수보다 작으면 MEETING_CAPACITY_BELOW_ATTENDEES', async () => {
      countAttendees.mockResolvedValue(4);
      await expect(
        service.updateMeeting(hostUserId, clubId, meetingId, { capacity: 3 }),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_CAPACITY_BELOW_ATTENDEES',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: 999n,
        deletedAt: null,
      });
      await expect(
        service.updateMeeting(hostUserId, clubId, meetingId, { capacity: 10 }),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_HOST' });
    });

    it('정모가 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.updateMeeting(hostUserId, clubId, meetingId, { capacity: 10 }),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });

  describe('deleteMeeting', () => {
    it('호스트가 정모를 삭제하면 Meeting + MeetingMember가 soft delete된다', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      softDeleteWithMembers.mockResolvedValue(true);

      const result = await service.deleteMeeting(hostUserId, clubId, meetingId);

      expect(result.meetingId).toBe(Number(meetingId));
      expect(result.clubId).toBe(Number(clubId));
      expect(typeof result.deletedAt).toBe('string');
      expect(softDeleteWithMembers).toHaveBeenCalledTimes(1);
      expect(softDeleteWithMembers).toHaveBeenCalledWith(
        clubId,
        meetingId,
        expect.any(Date),
      );
    });

    it('repository에서 삭제 대상이 갱신되지 않으면 MEETING_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      softDeleteWithMembers.mockResolvedValue(false);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
      expect(softDeleteWithMembers).toHaveBeenCalledWith(
        clubId,
        meetingId,
        expect.any(Date),
      );
    });

    it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: 999n,
        deletedAt: null,
      });

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_HOST' });
      expect(softDeleteWithMembers).not.toHaveBeenCalled();
    });

    it('클럽이 없으면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue(null);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
      expect(softDeleteWithMembers).not.toHaveBeenCalled();
    });

    it('soft-deleted 클럽이면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: new Date(),
      });

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    });
  });
});
