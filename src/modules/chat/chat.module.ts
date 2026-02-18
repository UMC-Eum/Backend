import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

import { MessageController } from './controllers/message/message.controller';
import { ChatMediaController } from './controllers/media/chat-media.controller';
import { RoomController } from './controllers/room/room.controller';
import { MessageRepository } from './repositories/message.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { RoomRepository } from './repositories/room.repository';

import { MessageService } from './services/message/message.service';
import { ChatMediaService } from './services/chat-media/chat-media.service';
import { ParticipantService } from './services/participant/participant.service';
import { RoomService } from './services/room/room.service';

import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule],
  controllers: [RoomController, MessageController, ChatMediaController],
  providers: [
    RoomService,
    ParticipantService,
    MessageService,
    ChatMediaService,
    RoomRepository,
    ParticipantRepository,
    MessageRepository,
    ChatGateway,
  ],
})
export class ChatModule {}
