import { Test, TestingModule } from '@nestjs/testing';

import { ClubChatService } from './club-chat.service';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

describe('ClubChatService', () => {
  let service: ClubChatService;

  const clubRepoMock: Partial<ClubRepository> = {
    findClubBasic: jest.fn(),
    findActiveClubUser: jest.fn(),
  };

  const roomRepoMock: Partial<RoomRepository> = {
    ensureClubRoom: jest.fn(),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    ensureClubParticipant: jest.fn(),
    countActiveParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubChatService,
        { provide: ClubRepository, useValue: clubRepoMock },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
      ],
    }).compile();

    service = module.get(ClubChatService);
    jest.clearAllMocks();
  });

  it('should throw CLUB_NOT_FOUND when club missing or deleted', async () => {
    (clubRepoMock.findClubBasic as jest.Mock).mockResolvedValue(null);

    await expect(service.enterClubRoom(1, 7)).rejects.toMatchObject({
      internalCode: 'CLUB_NOT_FOUND',
    });
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
    });
    (
      participantRepoMock.countActiveParticipants as jest.Mock
    ).mockResolvedValue(3);

    const res = await service.enterClubRoom(1, 7);

    expect(res).toEqual({
      chatRoomId: 101,
      type: 'CLUB',
      created: true,
      club: { clubId: 7, name: '클럽', thumbnailUrl: 'https://img/club.png' },
      memberCount: 3,
    });
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
  });
});
