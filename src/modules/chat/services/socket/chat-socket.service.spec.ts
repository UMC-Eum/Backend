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
    findPeerUserId: jest.fn(),
    isBlockedBetweenUsers: jest.fn(),
  };
  const roomRepoMock: Partial<RoomRepository> = {
    getRoomTypeInfo: jest.fn(),
  };
  const clubRepoMock: Partial<ClubRepository> = {
    findActiveClubUser: jest.fn(),
  };
  const messageRepoMock: Partial<MessageRepository> = {
    createMessage: jest.fn(),
  };
  const chatMediaServiceMock: Partial<ChatMediaService> = {
    toClientUrl: jest.fn(),
    normalizeChatMediaRef: jest.fn(),
  };
  const notificationServiceMock: Partial<NotificationService> = {
    createNotification: jest.fn(),
  };
  const prismaMock = {
    user: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSocketService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: MessageRepository, useValue: messageRepoMock },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ClubRepository, useValue: clubRepoMock },
        { provide: ChatMediaService, useValue: chatMediaServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
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

  describe('sendMessage', () => {
    it('should reject SYSTEM type from users', async () => {
      await expect(
        service.sendMessage({} as never, 1, {
          chatRoomId: 10,
          type: 'SYSTEM' as never,
          text: 'x',
        }),
      ).rejects.toMatchObject({ internalCode: 'VALIDATION_INVALID_FORMAT' });
      expect(participantRepoMock.isParticipant).not.toHaveBeenCalled();
    });

    it('should return ok, messageId and sentAt in the ACK for a TEXT message', async () => {
      const sentAt = new Date('2025-12-30T04:06:00.000Z');
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
      ).mockResolvedValue(false);
      (messageRepoMock.createMessage as jest.Mock).mockResolvedValue({
        id: BigInt(9001),
        sentAt,
      });
      (chatMediaServiceMock.toClientUrl as jest.Mock).mockResolvedValue(null);
      prismaMock.user.findFirst.mockResolvedValue({ nickname: 'me' });
      (
        notificationServiceMock.createNotification as jest.Mock
      ).mockResolvedValue({
        id: BigInt(1),
        type: 'CHAT',
        title: 'me',
        body: 'hello',
        isRead: false,
        createdAt: new Date(),
      });

      const emit = jest.fn();
      const server = { to: jest.fn().mockReturnValue({ emit }) } as never;

      const ack = await service.sendMessage(server, 1, {
        chatRoomId: 10,
        type: 'TEXT',
        text: 'hello',
      });

      expect(ack).toEqual({
        ok: true,
        messageId: 9001,
        sentAt: sentAt.toISOString(),
      });
    });
  });
});
