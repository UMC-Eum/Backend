import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { AttachMediaDto } from './dto/attach-media.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  createRoom(@Body() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto);
  }

  @Get('rooms')
  findRooms(@Query('userId') userId?: string) {
    return this.chatService.findAll(userId ? Number(userId) : undefined);
  }

  @Get('rooms/:id')
  findRoom(@Param('id') id: string) {
    return this.chatService.findOne(Number(id));
  }

  @Patch('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(Number(id), updateChatDto);
  }

  @Delete('rooms/:id')
  closeRoom(@Param('id') id: string) {
    return this.chatService.remove(Number(id));
  }

  @Post('messages')
  createMessage(@Body() dto: CreateChatMessageDto) {
    return this.chatService.createMessage(dto);
  }

  @Get('rooms/:roomId/messages')
  listMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.listMessages(Number(roomId), limit ? Number(limit) : undefined, cursor ? Number(cursor) : undefined);
  }

  @Patch('messages/:id')
  updateMessage(@Param('id') id: string, @Body() dto: UpdateChatMessageDto) {
    return this.chatService.updateMessage(Number(id), dto);
  }

  @Post('media')
  attachMedia(@Body() dto: AttachMediaDto) {
    return this.chatService.attachMedia(dto);
  }

  @Get('messages/:messageId/media')
  listMedia(@Param('messageId') messageId: string) {
    return this.chatService.listMedia(Number(messageId));
  }
}
