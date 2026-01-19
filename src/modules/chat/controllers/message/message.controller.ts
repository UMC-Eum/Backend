import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUser } from '../../../auth/decorators/required-user.decorator';
import type { AuthenticatedUser } from '../../../auth/decorators/auth-user.types';

import { ListMessagesQueryDto } from '../../dtos/message.dto';
import { MessageService } from '../../services/message/message.service';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('chats')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('rooms/:chatRoomId/messages')
  async listMessages(
    @RequiredUser() user: AuthenticatedUser,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messageService.listMessages(user.userId, chatRoomId, query);
  }

  @Patch('messages/:messageId/read')
  async markAsRead(
    @RequiredUser() user: AuthenticatedUser,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.markAsRead(user.userId, messageId);
    return null;
  }

  @Patch('messages/:messageId')
  async deleteMessage(
    @RequiredUser() user: AuthenticatedUser,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.deleteMessage(user.userId, messageId);
    return null;
  }
}
