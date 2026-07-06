import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { ClubModule } from '../club/club.module';

import { MessageController } from './controllers/message/message.controller';
import { ChatMediaController } from './controllers/media/chat-media.controller';
import { RoomController } from './controllers/room/room.controller';
import { ClubChatController } from './controllers/club-chat/club-chat.controller';
import { MessageRepository } from './repositories/message.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { RoomRepository } from './repositories/room.repository';

import { MessageService } from './services/message/message.service';
import { ChatMediaService } from './services/chat-media/chat-media.service';
import { ParticipantService } from './services/participant/participant.service';
import { RoomService } from './services/room/room.service';
import { ChatSocketService } from './services/socket/chat-socket.service';
import { ClubChatService } from './services/club-chat/club-chat.service';

import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule, ClubModule],
  controllers: [
    RoomController,
    MessageController,
    ChatMediaController,
    ClubChatController,
  ],
  providers: [
    RoomService,
    ParticipantService,
    MessageService,
    ChatMediaService,
    ChatSocketService,
    ClubChatService,
    RoomRepository,
    ParticipantRepository,
    MessageRepository,
    ChatGateway,
  ],
})
export class ChatModule {}
