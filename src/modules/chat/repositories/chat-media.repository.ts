import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AttachMediaDto } from '../dto/attach-media.dto';

@Injectable()
export class ChatMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  attach(dto: AttachMediaDto) {
    const data: Prisma.ChatMediaUncheckedCreateInput = {
      messageId: BigInt(dto.messageId),
      type: dto.type,
      url: dto.url,
      text: dto.text,
    };

    return this.prisma.chatMedia.create({ data });
  }

  listByMessage(messageId: number) {
    return this.prisma.chatMedia.findMany({
      where: { messageId: BigInt(messageId) },
      include: { message: true },
    });
  }
}
