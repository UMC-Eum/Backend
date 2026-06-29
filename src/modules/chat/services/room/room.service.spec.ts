import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';

import { RoomRepository } from '../../repositories/room.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { MessageRepository } from '../../repositories/message.repository';
import { ClubRepository } from '../../../club/repositories/club.repository';

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
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
    findPeerUserId: jest.fn(),
    getMyRoomIds: jest.fn(),
    findPeerUserIdsByRoomIds: jest.fn(),
    getMyReadStateByRoomIds: jest.fn(),
  };

  const messageRepoMock: Partial<MessageRepository> = {
    getLastSentAtByRoomIds: jest.fn(),
    countUnreadByCursor: jest.fn(),
    getLastMessageSummary: jest.fn(),
  };

  const clubRepoMock: Partial<ClubRepository> = {
    findClubBasic: jest.fn(),
    findClubBriefsByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: MessageRepository, useValue: messageRepoMock },
        { provide: ClubRepository, useValue: clubRepoMock },
      ],
    }).compile();

    service = module.get(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
