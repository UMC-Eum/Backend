import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatRoomRepository } from './repositories/chat-room.repository';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { ChatMediaRepository } from './repositories/chat-media.repository';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { AttachMediaDto } from './dto/attach-media.dto';
import { ChatMediaType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly chatMediaRepository: ChatMediaRepository,
  ) {}

  create(createChatDto: CreateChatDto) {
    return this.chatRoomRepository.create(createChatDto);
  }

  findAll(userId?: number) {
    return this.chatRoomRepository.list(userId ? { userId } : undefined);
  }

  async findOne(id: number) {
    const room = await this.chatRoomRepository.findById(BigInt(id));
    if (!room) throw new NotFoundException('Chat room not found');
    return room;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return this.chatRoomRepository.update(BigInt(id), updateChatDto);
  }

  remove(id: number) {
    return this.chatRoomRepository.endRoom(BigInt(id));
  }

  async createMessage(dto: CreateChatMessageDto) {
    const message = await this.chatMessageRepository.create(dto);

    if (dto.text) {
      await this.chatMediaRepository.attach({
        messageId: Number(message.id),
        type: 'TEXT',
        text: dto.text,
      });
    }

    if (dto.mediaUrl && dto.mediaType) {
      await this.chatMediaRepository.attach({
        messageId: Number(message.id),
        type: dto.mediaType,
        url: dto.mediaUrl,
      });
    }

    return message;
  }

  updateMessage(id: number, dto: UpdateChatMessageDto) {
    return this.chatMessageRepository.update(BigInt(id), dto);
  }

  listMessages(roomId: number, limit?: number, cursor?: number) {
    return this.chatMessageRepository.listByRoom(roomId, limit, cursor, true);
  }

  attachMedia(dto: AttachMediaDto) {
    return this.chatMediaRepository.attach(dto);
  }

  listMedia(messageId: number) {
    return this.chatMediaRepository.listByMessage(messageId);
  }
}
