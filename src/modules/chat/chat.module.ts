import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';

import { MessageController } from './controllers/message/message.controller';
import { RoomController } from './controllers/room/room.controller';

import { MessageRepository } from './repositories/message.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { RoomRepository } from './repositories/room.repository';

import { MessageService } from './services/message/message.service';
import { ParticipantService } from './services/participant/participant.service';
import { RoomService } from './services/room/room.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoomController, MessageController],
  providers: [
    RoomService,
    ParticipantService,
    MessageService,
    RoomRepository,
    ParticipantRepository,
    MessageRepository,
  ],
})
export class ChatModule {}
