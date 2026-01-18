import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { DevUserId } from '../../../../common/decorators/dev-user-id.decorator';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { ListMessagesQueryDto, SendMessageDto } from '../../dtos/message.dto';
import { MessageService } from '../../services/message/message.service';

@ApiTags('Chats')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'DEV ONLY(Auth 전): 내 userId (예: x-user-id: 1)',
})
@Controller('chats')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('rooms/:chatRoomId/messages')
  async listMessages(
    @DevUserId() meUserId: number,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messageService.listMessages(meUserId, chatRoomId, query);
  }

  @Post('rooms/:chatRoomId/messages')
  async sendMessage(
    @DevUserId() meUserId: number,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(meUserId, chatRoomId, dto);
  }

  @Patch('messages/:messageId/read')
  async markAsRead(
    @DevUserId() meUserId: number,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.markAsRead(meUserId, messageId);
    return null;
  }

  @Patch('messages/:messageId')
  async deleteMessage(
    @DevUserId() meUserId: number,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.deleteMessage(meUserId, messageId);
    return null;
  }
}
