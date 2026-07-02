import { Test, TestingModule } from '@nestjs/testing';

import { ChatSocketService } from './chat-socket.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { MessageRepository } from '../../repositories/message.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ChatMediaService } from '../chat-media/chat-media.service';
import { NotificationService } from '../../../notification/services/notification.service';

describe('ChatSocketService', () => {
  let service: ChatSocketService;

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
  };
  const roomRepoMock: Partial<RoomRepository> = {
    getRoomTypeInfo: jest.fn(),
  };
  const clubRepoMock: Partial<ClubRepository> = {
    findActiveClubUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSocketService,
        { provide: PrismaService, useValue: {} },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: MessageRepository, useValue: {} },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ClubRepository, useValue: clubRepoMock },
        { provide: ChatMediaService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(ChatSocketService);
    jest.clearAllMocks();
  });

  describe('joinRoom', () => {
    it('should throw CLUB_FORBIDDEN_NOT_MEMBER for CLUB when membership was revoked', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(1),
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

      await expect(
        service.joinRoom(1, { chatRoomId: 10 }),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
    });

    it('should return chatRoomId for CLUB when still an active member', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(1),
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue({
        id: BigInt(50),
        authority: 'GENERAL',
      });

      await expect(service.joinRoom(1, { chatRoomId: 10 })).resolves.toBe(10);
    });
  });
});
