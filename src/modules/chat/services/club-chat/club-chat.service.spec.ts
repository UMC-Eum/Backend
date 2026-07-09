import { Test, TestingModule } from '@nestjs/testing';

import { ClubChatService } from './club-chat.service';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ClubMemberRemovedEvent } from '../../../club/events/club-member-removed.event';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ChatGateway } from '../../gateways/chat.gateway';

describe('ClubChatService', () => {
  let service: ClubChatService;

  const clubRepoMock: Partial<ClubRepository> = {
    findClubBasic: jest.fn(),
    findActiveClubUser: jest.fn(),
  };

  const roomRepoMock: Partial<RoomRepository> = {
    ensureClubRoom: jest.fn(),
    findClubRoomId: jest.fn(),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    ensureClubParticipant: jest.fn(),
    countActiveParticipants: jest.fn(),
  };

  const messageRepoMock: Partial<MessageRepository> = {
    createSystemMessage: jest.fn(),
  };

  const chatGatewayMock: Partial<ChatGateway> = {
    emitChatMessage: jest.fn(),
    evictUserFromRoom: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubChatService,
        { provide: ClubRepository, useValue: clubRepoMock },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: MessageRepository, useValue: messageRepoMock },
        { provide: ChatGateway, useValue: chatGatewayMock },
      ],
    }).compile();

    service = module.get(ClubChatService);
    jest.clearAllMocks();
  });

  it('should throw CLUB_NOT_FOUND when club does not exist', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue(null);

    await expect(service.enterClubRoom(1, 7)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    });
  });

  it('should throw CLUB_FORBIDDEN_NOT_MEMBER when club is soft-deleted', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue({
      id: BigInt(7),
      name: '클럽',
      thumbnailUrl: null,
      hostId: BigInt(9),
      deletedAt: new Date('2026-02-10T00:00:00.000Z'),
    });
    (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

    await expect(service.enterClubRoom(1, 7)).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER',
    });
    expect(roomRepoMock.ensureClubRoom).not.toHaveBeenCalled();
  });

  it('should throw CLUB_FORBIDDEN_NOT_MEMBER when not an active member', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue({
      id: BigInt(7),
      name: '클럽',
      thumbnailUrl: null,
      hostId: BigInt(9),
      deletedAt: null,
    });
    (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

    await expect(service.enterClubRoom(1, 7)).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER',
    });
    expect(roomRepoMock.ensureClubRoom).not.toHaveBeenCalled();
  });

  it('should ensure room + participant and return entry info', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue({
      id: BigInt(7),
      name: '클럽',
      thumbnailUrl: 'https://img/club.png',
      hostId: BigInt(9),
      deletedAt: null,
    });
    (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue({
      id: BigInt(50),
      authority: 'GENERAL',
    });
    (roomRepoMock.ensureClubRoom as jest.Mock).mockResolvedValue(BigInt(101));
    (participantRepoMock.ensureClubParticipant as jest.Mock).mockResolvedValue({
      participantId: BigInt(200),
      created: true,
      nickname: '홍길동',
    });
    (
      participantRepoMock.countActiveParticipants as jest.Mock
    ).mockResolvedValue(3);
    (messageRepoMock.createSystemMessage as jest.Mock).mockResolvedValue({
      id: BigInt(300),
      sentAt: new Date('2026-02-10T00:00:00.000Z'),
    });

    const res = await service.enterClubRoom(1, 7);

    expect(res).toEqual({
      chatRoomId: 101,
      type: 'CLUB',
      created: true,
      club: { clubId: 7, name: '클럽', thumbnailUrl: 'https://img/club.png' },
      memberCount: 3,
    });
    // 입장 SYSTEM 메시지 실시간 broadcast
    expect(chatGatewayMock.emitChatMessage).toHaveBeenCalledTimes(1);
    expect(roomRepoMock.ensureClubRoom).toHaveBeenCalledWith(
      BigInt(7),
      BigInt(9),
    );
    expect(participantRepoMock.ensureClubParticipant).toHaveBeenCalledWith(
      BigInt(101),
      BigInt(1),
      'GENERAL',
      expect.any(Date),
    );
    // 최초 입장이면 입장 SYSTEM 메시지 영속
    expect(messageRepoMock.createSystemMessage).toHaveBeenCalledWith(
      BigInt(200),
      '홍길동님이 입장했습니다.',
    );
  });

  it('should NOT emit join SYSTEM message on re-entry (created=false)', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue({
      id: BigInt(7),
      name: '클럽',
      thumbnailUrl: null,
      hostId: BigInt(9),
      deletedAt: null,
    });
    (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue({
      id: BigInt(50),
      authority: 'GENERAL',
    });
    (roomRepoMock.ensureClubRoom as jest.Mock).mockResolvedValue(BigInt(101));
    (participantRepoMock.ensureClubParticipant as jest.Mock).mockResolvedValue({
      participantId: BigInt(200),
      created: false,
      nickname: null,
    });
    (
      participantRepoMock.countActiveParticipants as jest.Mock
    ).mockResolvedValue(3);

    const res = await service.enterClubRoom(1, 7);

    expect(res.created).toBe(false);
    expect(messageRepoMock.createSystemMessage).not.toHaveBeenCalled();
  });

  describe('onClubMemberRemoved (탈퇴/강퇴 시 소켓 퇴출)', () => {
    it('클럽 룸이 있으면 해당 유저를 룸에서 퇴출한다', async () => {
      (roomRepoMock.findClubRoomId as jest.Mock).mockResolvedValue(BigInt(101));

      await service.onClubMemberRemoved(
        new ClubMemberRemovedEvent(BigInt(7), BigInt(42)),
      );

      expect(roomRepoMock.findClubRoomId).toHaveBeenCalledWith(BigInt(7));
      expect(chatGatewayMock.evictUserFromRoom).toHaveBeenCalledWith(101, 42);
    });

    it('클럽 룸이 없으면 게이트웨이를 호출하지 않는다', async () => {
      (roomRepoMock.findClubRoomId as jest.Mock).mockResolvedValue(null);

      await service.onClubMemberRemoved(
        new ClubMemberRemovedEvent(BigInt(7), BigInt(42)),
      );

      expect(chatGatewayMock.evictUserFromRoom).not.toHaveBeenCalled();
    });

    it('퇴출 중 예외가 나도 전파하지 않는다(best-effort)', async () => {
      (roomRepoMock.findClubRoomId as jest.Mock).mockResolvedValue(BigInt(101));
      (chatGatewayMock.evictUserFromRoom as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(
        service.onClubMemberRemoved(
          new ClubMemberRemovedEvent(BigInt(7), BigInt(42)),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
