import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { ClubMemberService } from './club-member.service';
import { ClubRepository } from '../../repositories/club.repository';
import { ClubMemberRepository } from '../../repositories/club-member.repository';

describe('ClubMemberService', () => {
  let service: ClubMemberService;

  const findClubById = jest.fn();
  const findByClubAndUser = jest.fn();
  const createRequest = jest.fn();
  const resubmitRequest = jest.fn();
  const updatePendingStatus = jest.fn();

  const clubId = 12n;
  const userId = 42n;
  const hostUserId = 7n;
  const requestedAt = new Date('2026-05-01T15:40:00.000Z');
  const joinedAt = new Date('2026-05-02T15:40:00.000Z');

  const member = {
    id: 333n,
    clubId,
    userId,
    authority: ClubAuthority.GENERAL,
    status: ClubUserStatus.PENDING,
    joinMessage: '안녕하세요! 가입하고 싶습니다.',
    requestedAt,
    joinedAt: null,
    leftAt: null,
  };

  beforeEach(async () => {
    findClubById.mockReset();
    findByClubAndUser.mockReset();
    createRequest.mockReset();
    resubmitRequest.mockReset();
    updatePendingStatus.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubMemberService,
        { provide: ClubRepository, useValue: { findById: findClubById } },
        {
          provide: ClubMemberRepository,
          useValue: {
            findByClubAndUser,
            createRequest,
            resubmitRequest,
            updatePendingStatus,
          },
        },
      ],
    }).compile();

    service = module.get<ClubMemberService>(ClubMemberService);
  });

  it('가입 신청을 생성한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue(null);
    createRequest.mockResolvedValue(member);

    const result = await service.requestJoin(userId, clubId, {
      message: member.joinMessage,
    });

    expect(createRequest).toHaveBeenCalledWith({
      clubId,
      userId,
      message: member.joinMessage,
    });
    expect(result).toEqual({
      clubUserId: 333,
      clubId: 12,
      userId: 42,
      authority: ClubAuthority.GENERAL,
      status: ClubUserStatus.PENDING,
      message: member.joinMessage,
      requestedAt: requestedAt.toISOString(),
      joinedAt: null,
    });
  });

  it('이미 PENDING 신청이 있으면 CLUB_MEMBER_REQUEST_ALREADY_EXISTS', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue(member);

    await expect(
      service.requestJoin(userId, clubId, { message: member.joinMessage }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_REQUEST_ALREADY_EXISTS',
    });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('REJECTED 상태면 재신청으로 갱신한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.REJECTED,
    });
    resubmitRequest.mockResolvedValue(member);

    const result = await service.requestJoin(userId, clubId, {
      message: member.joinMessage,
    });

    expect(resubmitRequest).toHaveBeenCalledWith({
      clubId,
      userId,
      message: member.joinMessage,
    });
    expect(result.status).toBe(ClubUserStatus.PENDING);
  });

  it('호스트가 PENDING 신청을 승인한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    updatePendingStatus.mockResolvedValue({ count: 1 });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      joinedAt,
    });

    const result = await service.updateJoinRequestStatus(
      hostUserId,
      clubId,
      userId,
      { status: ClubUserStatus.ACTIVE },
    );

    expect(updatePendingStatus).toHaveBeenCalledWith({
      clubId,
      userId,
      status: ClubUserStatus.ACTIVE,
    });
    expect(result.status).toBe(ClubUserStatus.ACTIVE);
    expect(result.joinedAt).toBe(joinedAt.toISOString());
  });

  it('호스트가 아니면 승인/거절할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: 999n,
      deletedAt: null,
    });

    await expect(
      service.updateJoinRequestStatus(hostUserId, clubId, userId, {
        status: ClubUserStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    });
    expect(updatePendingStatus).not.toHaveBeenCalled();
  });

  it('PENDING 신청이 없으면 CLUB_MEMBER_REQUEST_NOT_FOUND', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    updatePendingStatus.mockResolvedValue({ count: 0 });

    await expect(
      service.updateJoinRequestStatus(hostUserId, clubId, userId, {
        status: ClubUserStatus.REJECTED,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_REQUEST_NOT_FOUND',
    });
  });
});
