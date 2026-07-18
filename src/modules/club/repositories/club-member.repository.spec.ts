import {
  ChatRoomType,
  ClubAuthority,
  ClubUserStatus,
  MeetingMemberStatus,
} from '@prisma/client';
import { ClubMemberRepository } from './club-member.repository';

describe('ClubMemberRepository', () => {
  let repository: ClubMemberRepository;

  const clubUserModel = {
    update: jest.fn(),
  };
  const meetingMemberModel = {
    updateMany: jest.fn(),
  };
  const chatParticipantModel = {
    updateMany: jest.fn(),
  };

  type TransactionMock = {
    clubUser: typeof clubUserModel;
    meetingMember: typeof meetingMemberModel;
    chatParticipant: typeof chatParticipantModel;
  };

  const prisma = {
    $transaction: jest.fn(
      <T>(callback: (tx: TransactionMock) => T): T =>
        callback({
          clubUser: clubUserModel,
          meetingMember: meetingMemberModel,
          chatParticipant: chatParticipantModel,
        }),
    ),
    clubUser: clubUserModel,
  };

  const clubId = 12n;
  const userId = 42n;
  const clubUserId = 333n;
  const fixedNow = new Date('2026-07-09T03:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();
    repository = new ClubMemberRepository(prisma as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('탈퇴 시 클럽 회원 상태 변경과 정모/클럽 채팅 참여 종료를 같은 트랜잭션에서 처리한다', async () => {
    clubUserModel.update.mockResolvedValue({
      id: clubUserId,
      clubId,
      userId,
      status: ClubUserStatus.LEFT,
      leftAt: fixedNow,
    });

    const result = await repository.leave(clubId, userId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(ClubUserStatus.LEFT);
    expect(clubUserModel.update).toHaveBeenCalledWith({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      data: {
        status: ClubUserStatus.LEFT,
        authority: ClubAuthority.GENERAL,
        leftAt: fixedNow,
      },
    });
    expect(meetingMemberModel.updateMany).toHaveBeenCalledWith({
      where: {
        clubUserId,
        deletedAt: null,
        status: {
          in: [MeetingMemberStatus.ACTIVE, MeetingMemberStatus.PENDING],
        },
        meeting: { clubId },
      },
      data: { deletedAt: fixedNow },
    });
    expect(chatParticipantModel.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        endedAt: null,
        room: {
          type: ChatRoomType.CLUB,
          clubId,
        },
      },
      data: { endedAt: fixedNow },
    });
  });

  it('강퇴 시 클럽 회원 상태 변경과 정모/클럽 채팅 참여 종료를 같은 트랜잭션에서 처리한다', async () => {
    clubUserModel.update.mockResolvedValue({
      id: clubUserId,
      clubId,
      userId,
      status: ClubUserStatus.KICKED,
      leftAt: fixedNow,
    });

    const result = await repository.kick(clubId, userId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(ClubUserStatus.KICKED);
    expect(clubUserModel.update).toHaveBeenCalledWith({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      data: {
        status: ClubUserStatus.KICKED,
        authority: ClubAuthority.GENERAL,
        leftAt: fixedNow,
      },
    });
    expect(meetingMemberModel.updateMany).toHaveBeenCalledWith({
      where: {
        clubUserId,
        deletedAt: null,
        status: {
          in: [MeetingMemberStatus.ACTIVE, MeetingMemberStatus.PENDING],
        },
        meeting: { clubId },
      },
      data: { deletedAt: fixedNow },
    });
    expect(chatParticipantModel.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        endedAt: null,
        room: {
          type: ChatRoomType.CLUB,
          clubId,
        },
      },
      data: { endedAt: fixedNow },
    });
  });
});
