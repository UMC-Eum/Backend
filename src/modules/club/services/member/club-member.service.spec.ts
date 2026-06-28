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
  const findPendingRequests = jest.fn();
  const findActiveMembers = jest.fn();
  const countActiveMembers = jest.fn();
  const leave = jest.fn();
  const kick = jest.fn();
  const delegateHost = jest.fn();

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
    findPendingRequests.mockReset();
    findActiveMembers.mockReset();
    countActiveMembers.mockReset();
    leave.mockReset();
    kick.mockReset();
    delegateHost.mockReset();

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
            findPendingRequests,
            findActiveMembers,
            countActiveMembers,
            leave,
            kick,
            delegateHost,
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
      capacity: 10,
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
      capacity: 10,
      deletedAt: null,
    });
    updatePendingStatus.mockResolvedValue({ count: 1 });
    countActiveMembers.mockResolvedValue(9);
    findByClubAndUser.mockResolvedValueOnce(member).mockResolvedValueOnce({
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
    expect(countActiveMembers).toHaveBeenCalledWith(clubId);
    expect(result.status).toBe(ClubUserStatus.ACTIVE);
    expect(result.joinedAt).toBe(joinedAt.toISOString());
  });

  it('정원이 가득 찬 클럽이면 가입 신청을 승인할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      capacity: 10,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue(member);
    countActiveMembers.mockResolvedValue(10);

    await expect(
      service.updateJoinRequestStatus(hostUserId, clubId, userId, {
        status: ClubUserStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_CAPACITY_EXCEEDED',
    });
    expect(updatePendingStatus).not.toHaveBeenCalled();
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
    findByClubAndUser.mockResolvedValue(null);

    await expect(
      service.updateJoinRequestStatus(hostUserId, clubId, userId, {
        status: ClubUserStatus.REJECTED,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_REQUEST_NOT_FOUND',
    });
    expect(updatePendingStatus).not.toHaveBeenCalled();
  });

  it('호스트가 가입 신청 목록을 조회한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findPendingRequests.mockResolvedValue([
      {
        ...member,
        user: {
          nickname: '홍길동',
          profileImageUrl: 'https://example.com/profile.png',
          age: 50,
          sex: 'M',
        },
      },
    ]);

    const result = await service.getJoinRequests(hostUserId, clubId);

    expect(findPendingRequests).toHaveBeenCalledWith(clubId);
    expect(result.items).toEqual([
      {
        clubUserId: 333,
        clubId: 12,
        userId: 42,
        authority: ClubAuthority.GENERAL,
        status: ClubUserStatus.PENDING,
        message: member.joinMessage,
        requestedAt: requestedAt.toISOString(),
        joinedAt: null,
        nickname: '홍길동',
        profileImageUrl: 'https://example.com/profile.png',
        age: 50,
        sex: 'M',
      },
    ]);
  });

  it('호스트가 아니면 가입 신청 목록을 조회할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: 999n,
      deletedAt: null,
    });

    await expect(
      service.getJoinRequests(hostUserId, clubId),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    });
    expect(findPendingRequests).not.toHaveBeenCalled();
  });

  it('ACTIVE 멤버가 가입자 목록을 조회한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      joinedAt,
    });
    findActiveMembers.mockResolvedValue([
      {
        ...member,
        status: ClubUserStatus.ACTIVE,
        joinedAt,
        user: {
          nickname: '홍길동',
          profileImageUrl: 'https://example.com/profile.png',
          age: 50,
          sex: 'M',
        },
      },
    ]);

    const result = await service.getMembers(userId, clubId);

    expect(findActiveMembers).toHaveBeenCalledWith(clubId);
    expect(result.items).toEqual([
      {
        clubUserId: 333,
        clubId: 12,
        userId: 42,
        authority: ClubAuthority.GENERAL,
        status: ClubUserStatus.ACTIVE,
        nickname: '홍길동',
        profileImageUrl: 'https://example.com/profile.png',
        age: 50,
        sex: 'M',
        joinedAt: joinedAt.toISOString(),
      },
    ]);
  });

  it('ACTIVE 멤버가 아니면 가입자 목록을 조회할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.PENDING,
    });

    await expect(service.getMembers(userId, clubId)).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_ONLY',
    });
    expect(findActiveMembers).not.toHaveBeenCalled();
  });

  it('ACTIVE 멤버가 탈퇴한다', async () => {
    const leftAt = new Date('2026-05-03T15:40:00.000Z');
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      joinedAt,
    });
    leave.mockResolvedValue({
      ...member,
      status: ClubUserStatus.LEFT,
      joinedAt,
      leftAt,
    });

    const result = await service.leave(userId, clubId);

    expect(leave).toHaveBeenCalledWith(clubId, userId);
    expect(result).toEqual({
      clubUserId: 333,
      clubId: 12,
      userId: 42,
      status: ClubUserStatus.LEFT,
      leftAt: leftAt.toISOString(),
    });
  });

  it('호스트는 권한 위임 전 탈퇴할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: userId,
      deletedAt: null,
    });

    await expect(service.leave(userId, clubId)).rejects.toMatchObject({
      internalCode: 'CLUB_HOST_LEAVE_FORBIDDEN',
    });
    expect(leave).not.toHaveBeenCalled();
  });

  it('ACTIVE 멤버가 아니면 탈퇴할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.PENDING,
    });

    await expect(service.leave(userId, clubId)).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_ONLY',
    });
    expect(leave).not.toHaveBeenCalled();
  });

  it('호스트가 ACTIVE 멤버를 강퇴한다', async () => {
    const leftAt = new Date('2026-05-04T15:40:00.000Z');
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      joinedAt,
    });
    kick.mockResolvedValue({
      ...member,
      status: ClubUserStatus.KICKED,
      joinedAt,
      leftAt,
    });

    const result = await service.kick(hostUserId, clubId, userId);

    expect(kick).toHaveBeenCalledWith(clubId, userId);
    expect(result).toEqual({
      clubUserId: 333,
      clubId: 12,
      userId: 42,
      status: ClubUserStatus.KICKED,
      leftAt: leftAt.toISOString(),
    });
  });

  it('호스트가 아니면 강퇴할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: 999n,
      deletedAt: null,
    });

    await expect(
      service.kick(hostUserId, clubId, userId),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    });
    expect(kick).not.toHaveBeenCalled();
  });

  it('호스트는 자기 자신을 강퇴할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });

    await expect(
      service.kick(hostUserId, clubId, hostUserId),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_HOST_KICK_FORBIDDEN',
    });
    expect(kick).not.toHaveBeenCalled();
  });

  it('ACTIVE 멤버가 아니면 강퇴 대상이 아니다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.PENDING,
    });

    await expect(
      service.kick(hostUserId, clubId, userId),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_NOT_FOUND',
    });
    expect(kick).not.toHaveBeenCalled();
  });

  it('호스트가 ACTIVE 멤버에게 호스트 권한을 위임한다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      joinedAt,
    });
    delegateHost.mockResolvedValue({
      ...member,
      status: ClubUserStatus.ACTIVE,
      authority: ClubAuthority.HOST,
      joinedAt,
    });

    const result = await service.updateAuthority(hostUserId, clubId, userId, {
      authority: ClubAuthority.HOST,
    });

    expect(delegateHost).toHaveBeenCalledWith({
      clubId,
      currentHostUserId: hostUserId,
      nextHostUserId: userId,
    });
    expect(result.authority).toBe(ClubAuthority.HOST);
    expect(result.status).toBe(ClubUserStatus.ACTIVE);
  });

  it('호스트가 아니면 권한을 변경할 수 없다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: 999n,
      deletedAt: null,
    });

    await expect(
      service.updateAuthority(hostUserId, clubId, userId, {
        authority: ClubAuthority.HOST,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
    });
    expect(delegateHost).not.toHaveBeenCalled();
  });

  it('단일 호스트 모델에서는 GENERAL 권한 변경을 허용하지 않는다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });

    await expect(
      service.updateAuthority(hostUserId, clubId, userId, {
        authority: ClubAuthority.GENERAL,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_HOST_AUTHORITY_REQUIRED',
    });
    expect(delegateHost).not.toHaveBeenCalled();
  });

  it('ACTIVE 멤버가 아니면 권한 변경 대상이 아니다', async () => {
    findClubById.mockResolvedValue({
      id: clubId,
      hostId: hostUserId,
      deletedAt: null,
    });
    findByClubAndUser.mockResolvedValue({
      ...member,
      status: ClubUserStatus.PENDING,
    });

    await expect(
      service.updateAuthority(hostUserId, clubId, userId, {
        authority: ClubAuthority.HOST,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_MEMBER_NOT_FOUND',
    });
    expect(delegateHost).not.toHaveBeenCalled();
  });
});
