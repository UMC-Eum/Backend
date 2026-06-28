import { Test, TestingModule } from '@nestjs/testing';
import { MeetingJoinPolicy } from '@prisma/client';
import { MeetingService } from './meeting.service';
import { ClubRepository } from '../../repositories/club.repository';
import { MeetingRepository } from '../../repositories/meeting.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { CreateMeetingRequestDto } from '../../dtos/meeting.dto';

describe('MeetingService', () => {
  let service: MeetingService;
  const findById = jest.fn();
  const create = jest.fn();
  const softDeleteWithMembers = jest.fn();

  const validDto: CreateMeetingRequestDto = {
    name: '매주하는 새벽등산',
    introText: '함께 새벽 산행할 분들 모집',
    date: '매주 목요일 저녁 19시',
    spot: '종로역 1번 출구 앞',
    capacity: 15,
    cost: '1인 10000원',
    joinPolicy: MeetingJoinPolicy.AUTO,
  };

  const hostUserId = 100n;
  const clubId = 7n;

  beforeEach(async () => {
    findById.mockReset();
    create.mockReset();
    softDeleteWithMembers.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: ClubRepository, useValue: { findById } },
        {
          provide: MeetingRepository,
          useValue: {
            create,
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

  it('호스트가 만들면 정모가 생성된다', async () => {
    findById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    create.mockResolvedValue({
      id: 1n,
      clubId,
      name: validDto.name,
      introText: validDto.introText,
      date: validDto.date,
      spot: validDto.spot,
      capacity: validDto.capacity,
      cost: validDto.cost ?? null,
      joinPolicy: validDto.joinPolicy,
      isRegular: true,
      createdAt: new Date('2026-05-17T12:00:00.000Z'),
      deletedAt: null,
      updatedAt: null,
    });

    const result = await service.createMeeting(hostUserId, clubId, validDto);

    expect(result.meetingId).toBe(1);
    expect(result.clubId).toBe(Number(clubId));
    expect(result.attendeeCount).toBe(0);
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
    ).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    });
  });

  it('soft-deleted 클럽이면 CLUB_NOT_FOUND', async () => {
    findById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: new Date(),
    });

    await expect(
      service.createMeeting(hostUserId, clubId, validDto),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    });
  });

  describe('deleteMeeting', () => {
    const meetingId = 88n;

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
      ).rejects.toMatchObject({
        internalCode: 'MEETING_NOT_FOUND',
      });
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
      ).rejects.toMatchObject({
        internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
      });
      expect(softDeleteWithMembers).not.toHaveBeenCalled();
    });

    it('클럽이 없으면 CLUB_NOT_FOUND', async () => {
      findById.mockResolvedValue(null);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'CLUB_NOT_FOUND',
      });
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
      ).rejects.toMatchObject({
        internalCode: 'CLUB_NOT_FOUND',
      });
    });

    // 아래 3개 케이스(정모 없음 / 이미 삭제됨 / clubId 불일치)는 모두
    // softDeleteWithMembers의 WHERE 절(id + clubId + deletedAt: null)에서 걸러져
    // count=0 → false 반환 → MEETING_NOT_FOUND로 귀결된다. service 레벨에서는
    // 구분 불가능하지만 입력 의도를 문서화하기 위해 케이스별로 유지한다.
    // (입력별 동작 차이는 repository 레벨 테스트에서 검증할 항목.)
    it('정모가 없으면 MEETING_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      softDeleteWithMembers.mockResolvedValue(false);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_NOT_FOUND',
      });
    });

    it('이미 삭제된 정모면 MEETING_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      softDeleteWithMembers.mockResolvedValue(false);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_NOT_FOUND',
      });
    });

    it('clubId/meetingId 불일치면 MEETING_NOT_FOUND', async () => {
      findById.mockResolvedValue({
        id: clubId,
        hostId: hostUserId,
        deletedAt: null,
      });
      softDeleteWithMembers.mockResolvedValue(false);

      await expect(
        service.deleteMeeting(hostUserId, clubId, meetingId),
      ).rejects.toMatchObject({
        internalCode: 'MEETING_NOT_FOUND',
      });
    });
  });
});
