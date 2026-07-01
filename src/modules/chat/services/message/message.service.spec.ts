import { Test, TestingModule } from '@nestjs/testing';

import { MessageService } from './message.service';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ChatGateway } from '../../gateways/chat.gateway';
import { ChatMediaService } from '../chat-media/chat-media.service';

describe('MessageService', () => {
  let service: MessageService;

  const messageRepoMock: Partial<MessageRepository> = {
    getLastMessageSummary: jest.fn(),
    findMessagesByRoomId: jest.fn(),
    findMessageById: jest.fn(),
    deleteMessage: jest.fn(),
    createMessage: jest.fn(),
  };

  const participantRepoMock: Partial<ParticipantRepository> = {
    isParticipant: jest.fn(),
    getMyRoomIds: jest.fn(),
    findPeerUserId: jest.fn(),
    isBlockedBetweenUsers: jest.fn(),
    getMyActiveParticipation: jest.fn(),
    markRoomRead: jest.fn(),
    findPeerReadState: jest.fn(),
    getActiveParticipantsWithUser: jest.fn(),
  };

  const roomRepoMock: Partial<RoomRepository> = {
    getPeerDetail: jest.fn(),
    getRoomTypeInfo: jest.fn(),
  };

  const clubRepoMock: Partial<ClubRepository> = {
    findClubBasic: jest.fn(),
    findActiveClubUser: jest.fn(),
  };

  const chatGatewayMock: Partial<ChatGateway> = {
    emitRoomRead: jest.fn(),
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
        { provide: ClubRepository, useValue: clubRepoMock },
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

  describe('markRoomRead', () => {
    it('should throw CHAT_ROOM_ACCESS_FAILED when not a participant', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.markRoomRead(1, 10)).rejects.toMatchObject({
        internalCode: 'CHAT_ROOM_ACCESS_FAILED',
      });
      expect(participantRepoMock.markRoomRead).not.toHaveBeenCalled();
    });

    it('should advance cursor and broadcast room read', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue({ joinedAt: new Date('2026-01-01T00:00:00.000Z') });
      (participantRepoMock.markRoomRead as jest.Mock).mockResolvedValue(true);
      (participantRepoMock.findPeerReadState as jest.Mock).mockResolvedValue({
        userId: BigInt(2),
        lastReadAt: null,
      });

      const res = await service.markRoomRead(1, 10);

      expect(typeof res.lastReadAt).toBe('string');
      expect(participantRepoMock.markRoomRead).toHaveBeenCalledTimes(1);
      expect(chatGatewayMock.emitRoomRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteMessage', () => {
    it('should throw CHAT_MESSAGE_BLOCKED when users are blocked', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        roomType: 'DIRECT',
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
        roomType: 'DIRECT',
        sentById: BigInt(2),
        sentToId: BigInt(1),
        deletedAt: null,
      });

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_ROOM_ACCESS_FAILED',
      });
      expect(messageRepoMock.deleteMessage).not.toHaveBeenCalled();
    });

    it('should throw CHAT_MESSAGE_UNSEND_NOT_ALLOWED when peer already read it (cursor >= sentAt)', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        roomType: 'DIRECT',
        sentById: BigInt(1),
        sentToId: BigInt(2),
        sentAt: new Date('2026-02-10T00:00:00.000Z'),
        deletedAt: null,
      });
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(false);
      // 상대 읽음 커서가 메시지 sentAt 이후 → 이미 읽음
      (participantRepoMock.findPeerReadState as jest.Mock).mockResolvedValue({
        userId: BigInt(2),
        lastReadAt: new Date('2026-02-11T00:00:00.000Z'),
      });

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_MESSAGE_UNSEND_NOT_ALLOWED',
      });
      expect(messageRepoMock.deleteMessage).not.toHaveBeenCalled();
      expect(chatGatewayMock.emitMessageDeleted).not.toHaveBeenCalled();
    });

    it('should unsend and emit when peer has not read it yet', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        roomType: 'DIRECT',
        sentById: BigInt(1),
        sentToId: BigInt(2),
        sentAt: new Date('2026-02-10T00:00:00.000Z'),
        deletedAt: null,
      });
      (
        participantRepoMock.isBlockedBetweenUsers as jest.Mock
      ).mockResolvedValue(false);
      (participantRepoMock.findPeerReadState as jest.Mock).mockResolvedValue({
        userId: BigInt(2),
        lastReadAt: null,
      });
      (messageRepoMock.deleteMessage as jest.Mock).mockResolvedValue(true);

      await expect(service.deleteMessage(1, 100)).resolves.toBeUndefined();
      expect(messageRepoMock.deleteMessage).toHaveBeenCalledTimes(1);
      expect(chatGatewayMock.emitMessageDeleted).toHaveBeenCalledTimes(1);
    });

    it('should block unsend for CLUB messages (CHAT_GROUP_MESSAGE_UNSEND_NOT_ALLOWED)', async () => {
      (messageRepoMock.findMessageById as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        roomId: BigInt(10),
        roomType: 'CLUB',
        sentById: BigInt(1),
        sentToId: BigInt(0),
        sentAt: new Date('2026-02-10T00:00:00.000Z'),
        deletedAt: null,
      });

      await expect(service.deleteMessage(1, 100)).rejects.toMatchObject({
        internalCode: 'CHAT_GROUP_MESSAGE_UNSEND_NOT_ALLOWED',
      });
      expect(messageRepoMock.deleteMessage).not.toHaveBeenCalled();
      expect(chatGatewayMock.emitMessageDeleted).not.toHaveBeenCalled();
    });
  });

  describe('listMessages', () => {
    it('should normalize peer to withdrawn placeholder when peer is INACTIVE (DIRECT)', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue({ joinedAt: new Date('2026-01-01T00:00:00.000Z') });
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'DIRECT',
        clubId: null,
      });
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
      (participantRepoMock.findPeerReadState as jest.Mock).mockResolvedValue(
        null,
      );
      (messageRepoMock.findMessagesByRoomId as jest.Mock).mockResolvedValue([]);

      const res = await service.listMessages(1, 10, {});

      expect(res.type).toBe('DIRECT');
      if (res.type !== 'DIRECT') throw new Error('expected DIRECT');
      expect(res.peer).toMatchObject({
        userId: 2,
        nickname: '탈퇴한 사용자',
        isWithdrawn: true,
      });
    });

    it('should build CLUB messages with sender identity and readCount', async () => {
      (
        participantRepoMock.getMyActiveParticipation as jest.Mock
      ).mockResolvedValue({ joinedAt: new Date('2026-01-01T00:00:00.000Z') });
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(7),
      });
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
      // 발신자=1, 멤버 2는 메시지 이후 읽음(커서>=sentAt), 멤버 3은 미열람
      (
        participantRepoMock.getActiveParticipantsWithUser as jest.Mock
      ).mockResolvedValue([
        { userId: BigInt(1), lastReadAt: new Date('2026-02-10T00:00:00.000Z') },
        { userId: BigInt(2), lastReadAt: new Date('2026-02-11T00:00:00.000Z') },
        { userId: BigInt(3), lastReadAt: null },
      ]);
      (messageRepoMock.findMessagesByRoomId as jest.Mock).mockResolvedValue([
        {
          id: BigInt(500),
          sentAt: new Date('2026-02-10T00:00:00.000Z'),
          readAt: null,
          sentById: BigInt(1),
          senderNickname: '보낸이',
          senderProfileImageUrl: 'https://img/1.png',
          senderStatus: 'ACTIVE',
          chatMedia: [
            { type: 'TEXT', text: '안녕', url: null, durationSec: null },
          ],
        },
      ]);
      (chatMediaServiceMock.toClientUrl as jest.Mock).mockResolvedValue(null);

      const res = await service.listMessages(1, 10, {});

      expect(res.type).toBe('CLUB');
      if (res.type !== 'CLUB') throw new Error('expected CLUB');
      expect(res.club).toEqual({
        clubId: 7,
        name: '클럽',
        thumbnailUrl: null,
      });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].sender).toMatchObject({
        userId: 1,
        nickname: '보낸이',
        isWithdrawn: false,
      });
      // 발신자(1) 제외, 멤버2만 읽음 → readCount 1
      expect(res.items[0].readCount).toBe(1);
      expect(res.items[0].isMine).toBe(true);
    });
  });

  describe('sendMessage (CLUB)', () => {
    it('should skip block check and create for an active club member', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(7),
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue({
        id: BigInt(50),
        authority: 'GENERAL',
      });
      (messageRepoMock.createMessage as jest.Mock).mockResolvedValue({
        id: BigInt(100),
        sentAt: new Date('2026-02-10T00:00:00.000Z'),
      });

      const res = await service.sendMessage(1, 10, {
        type: 'TEXT',
        text: 'hi',
      });

      expect(res.messageId).toBe(100);
      expect(participantRepoMock.isBlockedBetweenUsers).not.toHaveBeenCalled();
      expect(participantRepoMock.findPeerUserId).not.toHaveBeenCalled();
    });

    it('should throw CLUB_FORBIDDEN_NOT_MEMBER when membership was revoked', async () => {
      (participantRepoMock.isParticipant as jest.Mock).mockResolvedValue(true);
      (roomRepoMock.getRoomTypeInfo as jest.Mock).mockResolvedValue({
        type: 'CLUB',
        clubId: BigInt(7),
      });
      (clubRepoMock.findActiveClubUser as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendMessage(1, 10, { type: 'TEXT', text: 'hi' }),
      ).rejects.toMatchObject({ internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER' });
      expect(messageRepoMock.createMessage).not.toHaveBeenCalled();
    });
  });
});
