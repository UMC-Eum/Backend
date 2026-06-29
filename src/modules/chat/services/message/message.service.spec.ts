import { Test, TestingModule } from '@nestjs/testing';

import { MessageService } from './message.service';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ChatGateway } from '../../gateways/chat.gateway';
import { ChatMediaService } from '../chat-media/chat-media.service';

describe('MessageService', () => {
  let service: MessageService;

  const messageRepoMock: Partial<MessageRepository> = {
    getLastMessageSummary: jest.fn(),
    findMessagesByRoomId: jest.fn(),
    findMessageById: jest.fn(),
    markAsRead: jest.fn(),
    deleteMessage: jest.fn(),
    createMessage: jest.fn(),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
    getMyRoomIds: jest.fn(),
    findPeerUserId: jest.fn(),
    isBlockedBetweenUsers: jest.fn(),
    getMyActiveParticipation: jest.fn(),
  };

  const roomRepoMock: Partial<RoomRepository> = {
    getPeerDetail: jest.fn(),
  };

  const chatGatewayMock: Partial<ChatGateway> = {
    emitMessageRead: jest.fn(),
    emitMessageDeleted: jest.fn(),
  };

  const chatMediaServiceMock: Partial<ChatMediaService> = {
    toClientUrl: jest.fn(),
    normalizeChatMediaRef: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: MessageRepository, useValue: messageRepoMock },
        { provide: ParticipantRepository, useValue: participantRepoMock },
        { provide: RoomRepository, useValue: roomRepoMock },
        { provide: ChatGateway, useValue: chatGatewayMock },
        { provide: ChatMediaService, useValue: chatMediaServiceMock },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should throw CHAT_MESSAGE_BLOCKED when users are blocked', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (participantRepoMock.findPeerUserId as jest.Mock).mockResolvedValue(
        BigInt(2),
      );
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(true);

      await expect(
        service.sendMessage(1, 10, {
          type: 'TEXT',
          text: 'hello',
        }),
      ).rejects.toMatchObject({
        internalCode: 'CHAT_MESSAGE_BLOCKED',
      });
    });

    it('should create message when not blocked', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (participantRepoMock.findPeerUserId as jest.Mock).mockResolvedValue(
        BigInt(2),
      );
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(false);

      (messageRepoMock.createMessage as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        sentAt: new Date('2026-02-10T00:00:00.000Z'),
      });

      const res = await service.sendMessage(1, 10, {
        type: 'TEXT',
        text: 'hello',
      });

      expect(res).toEqual({
        messageId: 100,
        sentAt: '2026-02-10T00:00:00.000Z',
      });
      expect(messageRepoMock.createMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('markAsRead', () => {
    it('should throw CHAT_MESSAGE_BLOCKED when users are blocked', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        sentById: BigInt(2),
        sentToId: BigInt(1),
        deletedAt: null,
      });
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(true);

      await expect(service.markAsRead(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_MESSAGE_BLOCKED',
      });
      expect(messageRepoMock.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should throw CHAT_MESSAGE_BLOCKED when users are blocked', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        sentById: BigInt(1),
        sentToId: BigInt(2),
        deletedAt: null,
      });
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(true);

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_MESSAGE_BLOCKED',
      });
      expect(messageRepoMock.deleteMessage).not.toHaveBeenCalled();
    });

    it('should throw CHAT_ROOM_ACCESS_FAILED when caller is the receiver', async () => {
      // me=1, sender=2 → 수신자가 전송취소 호출
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        sentById: BigInt(2),
        sentToId: BigInt(1),
        deletedAt: null,
      });

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_ROOM_ACCESS_FAILED',
      });
      expect(messageRepoMock.deleteMessage).not.toHaveBeenCalled();
    });

    it('should throw CHAT_MESSAGE_UNSEND_NOT_ALLOWED when message already read (0 rows)', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        sentById: BigInt(1),
        sentToId: BigInt(2),
        deletedAt: null,
      });
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(false);
      (messageRepoMock.deleteMessage as jest.Mock).mockResolvedValue(false);

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_MESSAGE_UNSEND_NOT_ALLOWED',
      });
      expect(chatGatewayMock.emitMessageDeleted).not.toHaveBeenCalled();
    });

    it('should unsend and emit when sender deletes an unread message', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        sentById: BigInt(1),
        sentToId: BigInt(2),
        deletedAt: null,
      });
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(false);
      (messageRepoMock.deleteMessage as jest.Mock).mockResolvedValue(true);

      await expect(service.deleteMessage(1, 100)).resolves.toBeUndefined();
      expect(messageRepoMock.deleteMessage).toHaveBeenCalledTimes(1);
      expect(chatGatewayMock.emitMessageDeleted).toHaveBeenCalledTimes(1);
    });
  });

  describe('listMessages', () => {
    it('should normalize peer to withdrawn placeholder when peer is INACTIVE', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue({ joinedAt: new Date('2026-01-01T00:00:00.000Z') });
      (participantRepoMock.findPeerUserId as jest.Mock).mockResolvedValue(
        BigInt(2),
      );
      (roomRepoMock.getPeerDetail as jest.Mock).mockResolvedValue({
        id: BigInt(2),
        nickname: '원래닉네임',
        profileImageUrl: 'https://img/2.png',
        birthdate: new Date('2000-01-01T00:00:00.000Z'),
        age: 26,
        address: null,
        status: 'INACTIVE',
      });
      (messageRepoMock.findMessagesByRoomId as jest.Mock).mockResolvedValue([]);

      const res = await service.listMessages(1, 10, {});

      expect(res.peer).toMatchObject({
        userId: 2,
        nickname: '탈퇴한 사용자',
        isWithdrawn: true,
      });
    });
  });
});
