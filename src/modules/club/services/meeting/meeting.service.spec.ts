import { Test, TestingModule } from '@nestjs/testing';
import {
  ClubAuthority,
  DayOfWeek,
  MeetingJoinPolicy,
  RecurrenceType,
} from '@prisma/client';
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
  const findMemberByMeetingAndClubUser = jest.fn();
  const joinMeeting = jest.fn();
  const leaveMeeting = jest.fn();
  const listActiveMembers = jest.fn();

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
      findMemberByMeetingAndClubUser,
      joinMeeting,
      leaveMeeting,
      listActiveMembers,
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
            findMemberByMeetingAndClubUser,
            joinMeeting,
            leaveMeeting,
            listActiveMembers,
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
    beforeEach(() => {
      findActiveClubUser.mockResolvedValue({ id: 555n });
      findAttendeesPreview.mockResolvedValue([
        { userId: 42n, nickname: '호스트', profileImageUrl: 'u-host' },
      ]);
    });

    it('호스트가 만들면 정모가 생성되고 호스트가 자동 참석된다', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      create.mockResolvedValue(baseMeetingRow);

      const result = await service.createMeeting(hostUserId, clubId, validDto);

      expect(result.meetingId).toBe(Number(meetingId));
      expect(result.clubId).toBe(Number(clubId));
      expect(result.attendeeCount).toBe(1);
      expect(result.isAttending).toBe(true);
      expect(result.attendeesPreview).toHaveLength(1);
      expect(result.dateLabel).toBe('매주 목요일 오후 7시');
      expect(result.recurrence.type).toBe(RecurrenceType.WEEKLY);
      expect(result.recurrence.daysOfWeek).toEqual([DayOfWeek.THU]);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ hostClubUserId: 555n }),
      );
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

    it('호스트의 ClubUser가 없으면 CLUB_FORBIDDEN_NOT_MEMBER', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.createMeeting(hostUserId, clubId, validDto),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
      expect(create).not.toHaveBeenCalled();
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

  describe('joinMeeting', () => {
    const memberUserId = 200n;
    const memberClubUserId = 777n;

    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findActiveClubUser.mockResolvedValue({ id: memberClubUserId });
      findDetail.mockResolvedValue({ ...baseMeetingRow, capacity: 10 });
      findMemberByMeetingAndClubUser.mockResolvedValue(null);
      countAttendees.mockResolvedValue(3);
      joinMeeting.mockResolvedValue({
        id: 5001n,
        meetingId,
        clubUserId: memberClubUserId,
        joinedAt: new Date('2026-05-01T11:05:00.000Z'),
        deletedAt: null,
      });
    });

    it('정상 참석', async () => {
      const result = await service.joinMeeting(memberUserId, clubId, meetingId);
      expect(result.meetingMemberId).toBe(5001);
      expect(result.clubUserId).toBe(Number(memberClubUserId));
      expect(result.userId).toBe(Number(memberUserId));
      expect(result.joinedAt).toMatch(/\+09:00$/);
      expect(joinMeeting).toHaveBeenCalledWith(meetingId, memberClubUserId);
    });

    it('soft-deleted row가 있으면 revive (upsert)', async () => {
      findMemberByMeetingAndClubUser.mockResolvedValue({
        id: 5001n,
        meetingId,
        clubUserId: memberClubUserId,
        joinedAt: new Date('2026-04-01T10:00:00.000Z'),
        deletedAt: new Date('2026-04-15T10:00:00.000Z'),
      });
      await service.joinMeeting(memberUserId, clubId, meetingId);
      expect(joinMeeting).toHaveBeenCalled();
    });

    it('이미 ACTIVE row면 MEETING_ALREADY_JOINED', async () => {
      findMemberByMeetingAndClubUser.mockResolvedValue({
        id: 5001n,
        meetingId,
        clubUserId: memberClubUserId,
        joinedAt: new Date(),
        deletedAt: null,
      });
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_ALREADY_JOINED' });
      expect(joinMeeting).not.toHaveBeenCalled();
    });

    it('정원 초과면 MEETING_CAPACITY_EXCEEDED', async () => {
      countAttendees.mockResolvedValue(10);
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_CAPACITY_EXCEEDED' });
      expect(joinMeeting).not.toHaveBeenCalled();
    });

    it('비멤버면 CLUB_FORBIDDEN_NOT_MEMBER', async () => {
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
    });

    it('클럽 없으면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue(null);
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    });

    it('정모 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });

  describe('leaveMeeting', () => {
    const memberUserId = 200n;
    const memberClubUserId = 777n;

    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findActiveClubUser.mockResolvedValue({ id: memberClubUserId });
      findDetail.mockResolvedValue(baseMeetingRow);
      leaveMeeting.mockResolvedValue(1);
    });

    it('정상 취소', async () => {
      const result = await service.leaveMeeting(
        memberUserId,
        clubId,
        meetingId,
      );
      expect(result.meetingId).toBe(Number(meetingId));
      expect(result.userId).toBe(Number(memberUserId));
      expect(result.canceledAt).toMatch(/\+09:00$/);
    });

    it('호스트 본인이면 MEETING_HOST_CANNOT_LEAVE', async () => {
      await expect(
        service.leaveMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_HOST_CANNOT_LEAVE' });
      expect(leaveMeeting).not.toHaveBeenCalled();
    });

    it('미참석 상태면 MEETING_NOT_JOINED', async () => {
      leaveMeeting.mockResolvedValue(0);
      await expect(
        service.leaveMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_JOINED' });
    });

    it('비멤버면 CLUB_FORBIDDEN_NOT_MEMBER', async () => {
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.leaveMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
    });

    it('정모 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.leaveMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });

  describe('listAttendees', () => {
    const memberUserId = 200n;
    const memberClubUserId = 777n;

    const makeRow = (id: bigint, joinedAtMs: number) => ({
      id,
      clubUserId: id,
      joinedAt: new Date(joinedAtMs),
      userId: id,
      nickname: `user-${id}`,
      profileImageUrl: `u-${id}`,
      authority: ClubAuthority.GENERAL,
    });

    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findActiveClubUser.mockResolvedValue({ id: memberClubUserId });
      findDetail.mockResolvedValue(baseMeetingRow);
      countAttendees.mockResolvedValue(14);
    });

    it('첫 페이지: size+1 받아서 hasMore 판정', async () => {
      const rows = [makeRow(1n, 1000), makeRow(2n, 2000), makeRow(3n, 3000)];
      listActiveMembers.mockResolvedValue(rows);

      const result = await service.listAttendees(
        memberUserId,
        clubId,
        meetingId,
        { size: 2 },
      );

      expect(result.attendeeCount).toBe(14);
      expect(result.attendees).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
      expect(listActiveMembers).toHaveBeenCalledWith(meetingId, null, 3);
    });

    it('마지막 페이지면 hasMore=false, nextCursor=null', async () => {
      listActiveMembers.mockResolvedValue([makeRow(1n, 1000)]);

      const result = await service.listAttendees(
        memberUserId,
        clubId,
        meetingId,
        { size: 10 },
      );

      expect(result.attendees).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('비멤버면 CLUB_FORBIDDEN_NOT_MEMBER', async () => {
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.listAttendees(memberUserId, clubId, meetingId, {}),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
    });

    it('정모 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.listAttendees(memberUserId, clubId, meetingId, {}),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });
});
