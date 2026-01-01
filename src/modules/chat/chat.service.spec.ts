import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { ChatRoomRepository } from './repositories/chat-room.repository';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { ChatMediaRepository } from './repositories/chat-media.repository';

const mockChatRoomRepository = {
  create: jest.fn(),
  list: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  endRoom: jest.fn(),
};

const mockChatMessageRepository = {
  create: jest.fn(),
  listByRoom: jest.fn(),
  update: jest.fn(),
  markRead: jest.fn(),
};

const mockChatMediaRepository = {
  attach: jest.fn(),
  listByMessage: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRoomRepository, useValue: mockChatRoomRepository },
        { provide: ChatMessageRepository, useValue: mockChatMessageRepository },
        { provide: ChatMediaRepository, useValue: mockChatMediaRepository },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
