import { Injectable } from '@nestjs/common';
import { ChatRoomStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateChatDto } from '../dto/create-chat.dto';
import { UpdateChatDto } from '../dto/update-chat.dto';

@Injectable()
export class ChatRoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateChatDto) {
    const data: Prisma.ChatRoomUncheckedCreateInput = {
      userId: BigInt(dto.ownerUserId),
      status: dto.status ?? ChatRoomStatus.ACTIVE,
    };

    return this.prisma.chatRoom.create({ data });
  }

  findById(id: bigint) {
    return this.prisma.chatRoom.findFirst({ where: { id } });
  }

  list(params?: { userId?: number; status?: ChatRoomStatus }) {
    const where: Prisma.ChatRoomWhereInput = {};
    if (params?.userId) where.userId = BigInt(params.userId);
    if (params?.status) where.status = params.status;

    return this.prisma.chatRoom.findMany({ where, orderBy: { startedAt: 'desc' } });
  }

  update(id: bigint, dto: UpdateChatDto) {
    const data: Prisma.ChatRoomUncheckedUpdateInput = {};
    if (dto.status) data.status = dto.status;
    return this.prisma.chatRoom.update({ where: { id }, data });
  }

  endRoom(id: bigint) {
    return this.prisma.chatRoom.update({
      where: { id },
      data: { status: ChatRoomStatus.INACTIVE, endedAt: new Date() },
    });
  }
}
