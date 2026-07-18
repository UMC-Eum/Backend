import { Test, TestingModule } from '@nestjs/testing';
import {
  ClubAuthority,
  DayOfWeek,
  MeetingJoinPolicy,
  MeetingMemberStatus,
  RecurrenceType,
} from '@prisma/client';
import { MeetingService } from './meeting.service';
import { ClubRepository } from '../../club/repositories/club.repository';
import {
  MeetingDetailRow,
  MeetingRepository,
} from '../repositories/meeting.repository';
import { AppException } from '../../../common/errors/app.exception';
import {
  CreateMeetingRequestDto,
  UpdateMeetingRequestDto,
} from '../dtos/meeting.dto';

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
  const listPendingRequests = jest.fn();
  const processPendingStatusWithCapacity = jest.fn();

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
      listPendingRequests,
      processPendingStatusWithCapacity,
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
            listPendingRequests,
            processPendingStatusWithCapacity,
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
        meeting: {
          ...baseMeetingRow,
          recurrenceType: RecurrenceType.DAILY,
          daysOfWeek: [],
          dayOfMonth: null,
          hour: 7,
          minute: 0,
          updatedAt: new Date(),
        },
        capacityBelowAttendees: false,
        meetingMissing: false,
      });

      const result = await service.updateMeeting(
        hostUserId,
        clubId,
        meetingId,
        dto,
      );

      expect(update).toHaveBeenCalledWith(
        clubId,
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
      update.mockResolvedValue({
        meeting: null,
        capacityBelowAttendees: true,
        meetingMissing: false,
      });
      await expect(
        service.updateMeeting(hostUserId, clubId, meetingId, { capacity: 3 }),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_CAPACITY_BELOW_ATTENDEES',
      });
    });

    it('정모가 없거나 삭제된 상태면 MEETING_NOT_FOUND', async () => {
      update.mockResolvedValue({
        meeting: null,
        capacityBelowAttendees: false,
        meetingMissing: true,
      });
      await expect(
        service.updateMeeting(hostUserId, clubId, meetingId, { name: 'X' }),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
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
      joinMeeting.mockResolvedValue({
        member: {
          id: 5001n,
          meetingId,
          clubUserId: memberClubUserId,
          status: MeetingMemberStatus.ACTIVE,
          requestedAt: new Date('2026-05-01T11:05:00.000Z'),
          joinedAt: new Date('2026-05-01T11:05:00.000Z'),
          deletedAt: null,
        },
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: false,
        alreadyRequested: false,
      });
    });

    it('AUTO 정모: 정상 참석 (status=ACTIVE, joinedAt 세팅)', async () => {
      const result = await service.joinMeeting(memberUserId, clubId, meetingId);
      expect(result.meetingMemberId).toBe(5001);
      expect(result.clubUserId).toBe(Number(memberClubUserId));
      expect(result.userId).toBe(Number(memberUserId));
      expect(result.status).toBe(MeetingMemberStatus.ACTIVE);
      expect(result.joinedAt).toMatch(/\+09:00$/);
      expect(joinMeeting).toHaveBeenCalledWith(
        clubId,
        meetingId,
        memberClubUserId,
      );
    });

    it('승인정모: 참석 신청 시 PENDING 응답 (joinedAt=null)', async () => {
      joinMeeting.mockResolvedValue({
        member: {
          id: 5002n,
          meetingId,
          clubUserId: memberClubUserId,
          status: MeetingMemberStatus.PENDING,
          requestedAt: new Date('2026-05-01T11:05:00.000Z'),
          joinedAt: null,
          deletedAt: null,
        },
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: false,
        alreadyRequested: false,
      });

      const result = await service.joinMeeting(memberUserId, clubId, meetingId);
      expect(result.meetingMemberId).toBe(5002);
      expect(result.status).toBe(MeetingMemberStatus.PENDING);
      expect(result.joinedAt).toBeNull();
    });

    it('정원 초과면 MEETING_CAPACITY_EXCEEDED', async () => {
      joinMeeting.mockResolvedValue({
        member: null,
        capacityExceeded: true,
        meetingMissing: false,
        alreadyJoined: false,
        alreadyRequested: false,
      });
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_CAPACITY_EXCEEDED' });
    });

    it('정모가 없거나 삭제된 상태면 MEETING_NOT_FOUND', async () => {
      joinMeeting.mockResolvedValue({
        member: null,
        capacityExceeded: false,
        meetingMissing: true,
        alreadyJoined: false,
        alreadyRequested: false,
      });
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });

    it('이미 ACTIVE 멤버면 MEETING_ALREADY_JOINED', async () => {
      joinMeeting.mockResolvedValue({
        member: null,
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: true,
        alreadyRequested: false,
      });
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_ALREADY_JOINED' });
    });

    it('이미 신청 대기중이면 MEETING_ALREADY_REQUESTED', async () => {
      joinMeeting.mockResolvedValue({
        member: null,
        capacityExceeded: false,
        meetingMissing: false,
        alreadyJoined: false,
        alreadyRequested: true,
      });
      await expect(
        service.joinMeeting(memberUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_ALREADY_REQUESTED',
      });
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
      expect(listActiveMembers).toHaveBeenCalledWith(
        clubId,
        meetingId,
        null,
        3,
      );
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

    it('cursor의 id가 BigInt 파싱 불가면 VALIDATION_INVALID_FORMAT', async () => {
      const payload = { joinedAt: '2026-05-01T20:07:00.000Z', id: 'abc' };
      const cursor = Buffer.from(JSON.stringify(payload), 'utf8')
        .toString('base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
      await expect(
        service.listAttendees(memberUserId, clubId, meetingId, { cursor }),
      ).rejects.toMatchObject({ internalCode: 'VALIDATION_INVALID_FORMAT' });
    });

    it('cursor의 joinedAt이 Invalid Date면 VALIDATION_INVALID_FORMAT', async () => {
      const payload = { joinedAt: 'not-a-date', id: '5002' };
      const cursor = Buffer.from(JSON.stringify(payload), 'utf8')
        .toString('base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
      await expect(
        service.listAttendees(memberUserId, clubId, meetingId, { cursor }),
      ).rejects.toMatchObject({ internalCode: 'VALIDATION_INVALID_FORMAT' });
    });
  });

  describe('listMeetingRequests', () => {
    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findDetail.mockResolvedValue(baseMeetingRow);
      listPendingRequests.mockResolvedValue([
        {
          meetingMemberId: 9001n,
          clubUserId: 777n,
          requestedAt: new Date('2026-05-01T11:05:00.000Z'),
          userId: 200n,
          nickname: '지원자',
          profileImageUrl: 'u-200',
          authority: ClubAuthority.GENERAL,
        },
      ]);
    });

    it('호스트가 대기목록을 조회한다', async () => {
      const result = await service.listMeetingRequests(
        hostUserId,
        clubId,
        meetingId,
      );
      expect(result.meetingId).toBe(Number(meetingId));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]).toMatchObject({
        meetingMemberId: 9001,
        clubUserId: 777,
        user: {
          userId: 200,
          nickname: '지원자',
          authority: ClubAuthority.GENERAL,
        },
      });
      expect(result.requests[0].requestedAt).toMatch(/\+09:00$/);
    });

    it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: 999n,
        deletedAt: null,
      });
      await expect(
        service.listMeetingRequests(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_HOST' });
      expect(listPendingRequests).not.toHaveBeenCalled();
    });

    it('정모가 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.listMeetingRequests(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });

  describe('updateAttendeeStatus', () => {
    const targetUserId = 200n;
    const targetClubUserId = 777n;

    beforeEach(() => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      findDetail.mockResolvedValue({ ...baseMeetingRow, capacity: 10 });
      findActiveClubUser.mockResolvedValue({ id: targetClubUserId });
      processPendingStatusWithCapacity.mockResolvedValue({
        result: 'updated',
        member: {
          id: 9001n,
          meetingId,
          clubUserId: targetClubUserId,
          status: MeetingMemberStatus.ACTIVE,
          requestedAt: new Date('2026-05-01T11:05:00.000Z'),
          joinedAt: new Date('2026-05-02T11:05:00.000Z'),
          deletedAt: null,
        },
      });
    });

    it('호스트가 승인하면 ACTIVE로 전이되고 joinedAt이 세팅된다', async () => {
      const result = await service.updateAttendeeStatus(
        hostUserId,
        clubId,
        meetingId,
        targetUserId,
        { status: MeetingMemberStatus.ACTIVE },
      );
      expect(result.status).toBe(MeetingMemberStatus.ACTIVE);
      expect(result.userId).toBe(Number(targetUserId));
      expect(result.joinedAt).toMatch(/\+09:00$/);
      expect(processPendingStatusWithCapacity).toHaveBeenCalledWith({
        clubId,
        meetingId,
        targetClubUserId,
        status: MeetingMemberStatus.ACTIVE,
        capacity: 10,
      });
    });

    it('호스트가 거절하면 REJECTED로 전이되고 joinedAt은 null', async () => {
      processPendingStatusWithCapacity.mockResolvedValue({
        result: 'updated',
        member: {
          id: 9001n,
          meetingId,
          clubUserId: targetClubUserId,
          status: MeetingMemberStatus.REJECTED,
          requestedAt: new Date('2026-05-01T11:05:00.000Z'),
          joinedAt: null,
          deletedAt: null,
        },
      });
      const result = await service.updateAttendeeStatus(
        hostUserId,
        clubId,
        meetingId,
        targetUserId,
        { status: MeetingMemberStatus.REJECTED },
      );
      expect(result.status).toBe(MeetingMemberStatus.REJECTED);
      expect(result.joinedAt).toBeNull();
    });

    it('승인 시 정원 초과면 MEETING_CAPACITY_EXCEEDED', async () => {
      processPendingStatusWithCapacity.mockResolvedValue({
        result: 'capacity_exceeded',
      });
      await expect(
        service.updateAttendeeStatus(
          hostUserId,
          clubId,
          meetingId,
          targetUserId,
          {
            status: MeetingMemberStatus.ACTIVE,
          },
        ),
      ).rejects.toMatchObject({ internalCode: 'MEETING_CAPACITY_EXCEEDED' });
    });

    it('대기중 신청이 없으면 MEETING_REQUEST_NOT_FOUND', async () => {
      processPendingStatusWithCapacity.mockResolvedValue({
        result: 'not_found',
      });
      await expect(
        service.updateAttendeeStatus(
          hostUserId,
          clubId,
          meetingId,
          targetUserId,
          {
            status: MeetingMemberStatus.ACTIVE,
          },
        ),
      ).rejects.toMatchObject({ internalCode: 'MEETING_REQUEST_NOT_FOUND' });
    });

    it('대상 유저가 클럽 멤버가 아니면 MEETING_REQUEST_NOT_FOUND', async () => {
      findActiveClubUser.mockResolvedValue(null);
      await expect(
        service.updateAttendeeStatus(
          hostUserId,
          clubId,
          meetingId,
          targetUserId,
          {
            status: MeetingMemberStatus.ACTIVE,
          },
        ),
      ).rejects.toMatchObject({ internalCode: 'MEETING_REQUEST_NOT_FOUND' });
      expect(processPendingStatusWithCapacity).not.toHaveBeenCalled();
    });

    it('호스트가 아니면 CLUB_FORBIDDEN_NOT_HOST', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: 999n,
        deletedAt: null,
      });
      await expect(
        service.updateAttendeeStatus(
          hostUserId,
          clubId,
          meetingId,
          targetUserId,
          {
            status: MeetingMemberStatus.ACTIVE,
          },
        ),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_HOST' });
    });

    it('정모가 없으면 MEETING_NOT_FOUND', async () => {
      findDetail.mockResolvedValue(null);
      await expect(
        service.updateAttendeeStatus(
          hostUserId,
          clubId,
          meetingId,
          targetUserId,
          {
            status: MeetingMemberStatus.ACTIVE,
          },
        ),
      ).rejects.toMatchObject({ internalCode: 'MEETING_NOT_FOUND' });
    });
  });
});
