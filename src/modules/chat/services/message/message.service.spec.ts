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
});
