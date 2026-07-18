import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';

import { RoomRepository } from '../../repositories/room.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { MessageRepository } from '../../repositories/message.repository';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ChatGateway } from '../../gateways/chat.gateway';

describe('RoomService', () => {
  let service: RoomService;

  // 최소 mock (RoomService가 실제 테스트에서 호출할 수 있는 메서드만 일단 정의)
  const roomRepoMock: Partial<RoomRepository> = {
    findPeerUserBasic: jest.fn(),
    findRoomIdByMeAndTarget: jest.fn(),
    createRoomWithParticipants: jest.fn(),
    getPeerDetail: jest.fn(),
    getAddressByCode: jest.fn(),
    getRoomsByIds: jest.fn(),
    getPeerBasicsByIds: jest.fn(),
    getRoomTypeInfo: jest.fn(),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
    findPeerUserId: jest.fn(),
    getMyRoomIds: jest.fn(),
    getMyJoinedAtByRoomIds: jest.fn(),
    findPeerUserIdsByRoomIds: jest.fn(),
    getMyReadStateByRoomIds: jest.fn(),
    getMyActiveParticipation: jest.fn(),
    getActiveParticipantsWithUser: jest.fn(),
    countActiveByRoomIds: jest.fn(),
  };

  const messageRepoMock: Partial<MessageRepository> = {
    getLastSentAtByRoomIds: jest.fn(),
    countUnreadByCursor: jest.fn(),
    getLastMessageSummary: jest.fn(),
  };

  const clubRepoMock: Partial<ClubRepository> = {
    findClubBasic: jest.fn(),
    findClubBriefsByIds: jest.fn(),
    findActiveClubUser: jest.fn(),
    findActiveMembershipClubIds: jest.fn(),
  };

  const chatGatewayMock: Partial<ChatGateway> = {
    emitChatMessage: jest.fn(),
    emitRoomRead: jest.fn(),
    emitMessageDeleted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: MessageRepository, useValue: messageRepoMock },
        { provide: ClubRepository, useValue: clubRepoMock },
        { provide: ChatGateway, useValue: chatGatewayMock },
      ],
    }).compile();

    service = module.get(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRoomDetail (CLUB)', () => {
    it('should throw CLUB_FORBIDDEN_NOT_MEMBER when membership was revoked', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue({ joinedAt: new Date('2026-01-01T00:00:00.000Z') });
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(1),
      });
      (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        name: '클럽',
        thumbnailUrl: null,
        hostId: BigInt(1),
        deletedAt: null,
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

      await expect(service.getRoomDetail(2, 10)).rejects.toMatchObject({
        internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER',
      });
      expect(
        participantRepoMock.getActiveParticipantsWithUser,
      ).not.toHaveBeenCalled();
    });
  });

  describe('listRooms', () => {
    it('should exclude CLUB rooms where I am not an active member', async () => {
      (participantRepoMock.getMyRoomIds as jest.Mock).mockResolvedValue([
        BigInt(5),
      ]);
      (roomRepoMock.getRoomsByIds as jest.Mock).mockResolvedValue([
        {
          id: BigInt(5),
          type: 'CLUB',
          clubId: BigInt(9),
          startedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
      (clubRepoMock.findActiveMembershipClubIds as jest.Mock).mockResolvedValue(
        [],
      );

      const res = await service.listRooms(2, {});

      expect(res.items).toEqual([]);
      expect(res.nextCursor).toBeNull();
    });

    it('should keep DIRECT room in my list when peer already left the room', async () => {
      const roomId = BigInt(10);
      const me = BigInt(2);
      const peer = BigInt(7);
      const joinedAt = new Date('2026-01-01T00:00:00.000Z');

      (participantRepoMock.getMyRoomIds as jest.Mock).mockResolvedValue([
        roomId,
      ]);
      (roomRepoMock.getRoomsByIds as jest.Mock).mockResolvedValue([
        {
          id: roomId,
          type: 'DIRECT',
          clubId: null,
          startedAt: joinedAt,
        },
      ]);
      (clubRepoMock.findActiveMembershipClubIds as jest.Mock).mockResolvedValue(
        [],
      );
      (
        participantRepoMock.getMyJoinedAtByRoomIds as jest.Mock
      ).mockResolvedValue(new Map([[roomId, joinedAt]]));
      (messageRepoMock.getLastSentAtByRoomIds as jest.Mock).mockResolvedValue(
        new Map(),
      );
      (
        participantRepoMock.findPeerUserIdsByRoomIds as jest.Mock
      ).mockResolvedValue(new Map([[roomId, peer]]));
      (roomRepoMock.getPeerBasicsByIds as jest.Mock).mockResolvedValue([
        {
          id: peer,
          nickname: '상대',
          profileImageUrl: null,
          status: 'ACTIVE',
          address: { fullName: '서울특별시 강남구' },
        },
      ]);
      (clubRepoMock.findClubBriefsByIds as jest.Mock).mockResolvedValue([]);
      (participantRepoMock.countActiveByRoomIds as jest.Mock).mockResolvedValue(
        new Map(),
      );
      (
        participantRepoMock.getMyReadStateByRoomIds as jest.Mock
      ).mockResolvedValue(new Map());
      (messageRepoMock.countUnreadByCursor as jest.Mock).mockResolvedValue(
        new Map(),
      );
      (messageRepoMock.getLastMessageSummary as jest.Mock).mockResolvedValue(
        null,
      );

      const res = await service.listRooms(Number(me), {});

      expect(participantRepoMock.findPeerUserIdsByRoomIds).toHaveBeenCalledWith(
        [roomId],
        me,
      );
      expect(res.items).toEqual([
        {
          chatRoomId: Number(roomId),
          type: 'DIRECT',
          peer: {
            userId: Number(peer),
            nickname: '상대',
            profileImageUrl: null,
            areaName: '서울특별시 강남구',
            isWithdrawn: false,
          },
          lastMessage: null,
          unreadCount: 0,
        },
      ]);
    });
  });
});
