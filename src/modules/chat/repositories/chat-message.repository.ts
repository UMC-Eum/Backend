import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateChatMessageDto } from '../dto/create-chat-message.dto';
import { UpdateChatMessageDto } from '../dto/update-chat-message.dto';

@Injectable()
export class ChatMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateChatMessageDto) {
    const data: Prisma.ChatMessageUncheckedCreateInput = {
      roomId: BigInt(dto.roomId),
      sentById: BigInt(dto.sentById),
      sentToId: BigInt(dto.sentToId),
      readAt: null,
      deletedAt: null,
    };

    return this.prisma.chatMessage.create({ data });
  }

  findById(id: bigint) {
    return this.prisma.chatMessage.findFirst({ where: { id } });
  }

  listByRoom(roomId: number, limit = 50, cursor?: number, includeMedia = false) {
    return this.prisma.chatMessage.findMany({
      where: { roomId: BigInt(roomId) },
      orderBy: { sentAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: BigInt(cursor) } } : {}),
      include: includeMedia ? { chatMedia: true, room: false } : undefined,
    });
  }

  update(id: bigint, dto: UpdateChatMessageDto) {
    const data: Prisma.ChatMessageUncheckedUpdateInput = {};
    if (dto.markDeleted) data.deletedAt = new Date();
    return this.prisma.chatMessage.update({ where: { id }, data });
  }

  markRead(id: bigint) {
    return this.prisma.chatMessage.update({ where: { id }, data: { readAt: new Date() } });
  }
}
