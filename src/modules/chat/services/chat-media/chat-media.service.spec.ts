import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { ChatMediaService } from './chat-media.service';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ClubRepository } from '../../../club/repositories/club.repository';

describe('ChatMediaService', () => {
  let service: ChatMediaService;

  const configValues: Record<string, unknown> = {
    CHAT_MEDIA_BUCKET: 'chat-media-bucket',
    AWS_S3_BUCKET: 'voice-bucket',
  };

  const configServiceMock = {
    get: jest.fn((_key: string, def?: unknown) => def),
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];

      if (value === undefined) {
        throw new Error(`Missing config: ${key}`);
      }

      return value;
    }),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
    findPeerUserId: jest.fn(),
    isBlockedBetweenUsers: jest.fn(),
  };

  const roomRepoMock: Partial<RoomRepository> = {
    getRoomTypeInfo: jest.fn(),
  };

  const clubRepoMock: Partial<ClubRepository> = {
    findActiveClubUser: jest.fn(),
  };

  const dto = {
    type: 'PHOTO',
    contentType: 'image/jpeg',
    fileName: 'photo.jpg',
  } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMediaService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ClubRepository, useValue: clubRepoMock },
      ],
    }).compile();

    service = module.get(ChatMediaService);
    jest.clearAllMocks();
  });

  describe('createUploadPresign', () => {
    it('should throw CLUB_FORBIDDEN_NOT_MEMBER for CLUB when not an active member', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(1),
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createUploadPresign(1, 10, dto),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
      expect(participantRepoMock.findPeerUserId).not.toHaveBeenCalled();
    });

    it('should throw CHAT_MESSAGE_BLOCKED for DIRECT when blocked', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'DIRECT',
        clubId: null,
      });
      (participantRepoMock.findPeerUserId as jest.Mock).mockResolvedValue(
        BigInt(2),
      );
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(true);

      await expect(
        service.createUploadPresign(1, 10, dto),
      ).rejects.toMatchObject({ internalCode: 'CHAT_MESSAGE_BLOCKED' });
    });
  });
});
