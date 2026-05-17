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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: ClubRepository, useValue: { findById } },
        { provide: MeetingRepository, useValue: { create } },
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

  it('capacity가 0 이하면 MEETING_VALIDATION_FAILED', async () => {
    findById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });

    await expect(
      service.createMeeting(hostUserId, clubId, { ...validDto, capacity: 0 }),
    ).rejects.toMatchObject({
      internalCode: 'MEETING_VALIDATION_FAILED',
    });
    expect(create).not.toHaveBeenCalled();
  });
});
