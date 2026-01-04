import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room/room.controller';
import { MessageController } from './controllers/message/message.controller';
import { RoomService } from './services/room/room.service';
import { ParticipantService } from './services/participant/participant.service';
import { MessageService } from './services/message/message.service';

@Module({
  providers: [RoomService, ParticipantService, MessageService],
  controllers: [RoomController, MessageController],
})
export class ChatModule {}
