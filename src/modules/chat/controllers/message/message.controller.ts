import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUser } from '../../../auth/decorators/required-user.decorator';
import type { AuthenticatedUser } from '../../../auth/decorators/auth-user.types';

import { ListMessagesQueryDto } from '../../dtos/message.dto';
import { MessageService } from '../../services/message/message.service';

type ApiSuccessExample<T> = {
  resultType: 'SUCCESS';
  success: { data: T };
  error: null;
  meta: { timestamp: string; path: string };
};

function successExample<T>(path: string, data: T): ApiSuccessExample<T> {
  return {
    resultType: 'SUCCESS',
    success: { data },
    error: null,
    meta: {
      timestamp: '2026-02-10T00:00:00.000Z',
      path,
    },
  };
}

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('chats')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('rooms/:chatRoomId/messages')
  @ApiOperation({
    summary: '메시지 목록 조회',
    description:
      '채팅방의 메시지 목록을 커서 기반으로 조회합니다. 참여자만 조회할 수 있으며, 채팅방 나가기/재입장(joinedAt 갱신) 이후에는 joinedAt 기준으로 메시지가 새로 조회됩니다.',
  })
  @ApiParam({
    name: 'chatRoomId',
    description: '조회할 채팅방 ID',
    example: 101,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '커서(base64url). 이전 페이지의 nextCursor를 전달합니다.',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '가져올 아이템 수 (기본 30, 최대 100)',
    example: 30,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: successExample('/api/v1/chats/rooms/101/messages?size=30', {
        chatRoomId: 101,
        peer: {
          userId: 9,
          nickname: '상대방',
          age: 27,
          areaName: '서울특별시 강남구',
        },
        items: [
          {
            messageId: 555,
            type: 'TEXT',
            text: '안녕하세요!',
            mediaUrl: null,
            durationSec: null,
            senderUserId: 9,
            sentAt: '2026-02-10T00:00:00.000Z',
            readAt: null,
            isMine: false,
          },
        ],
        nextCursor: null,
      }),
    },
  })
  @ApiForbiddenResponse({ description: '권한 없음 (채팅방 참여자가 아님)' })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async listMessages(
    @RequiredUser() user: AuthenticatedUser,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messageService.listMessages(user.userId, chatRoomId, query);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({
    summary: '메시지 읽음 처리',
    description:
      '특정 메시지를 읽음 처리합니다. 수신자만 가능하며, 성공 시 data는 null 입니다.',
  })
  @ApiParam({
    name: 'messageId',
    description: '읽음 처리할 메시지 ID',
    example: 555,
  })
  @ApiOkResponse({
    description: '처리 성공',
    schema: {
      example: successExample('/api/v1/chats/messages/555/read', null),
    },
  })
  @ApiUnprocessableEntityResponse({
    description: '요청값이 유효하지 않음 (메시지 없음 등)',
  })
  @ApiForbiddenResponse({
    description: '권한 없음 (수신자가 아님 / 참여자가 아님 / 차단 상태)',
  })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async markAsRead(
    @RequiredUser() user: AuthenticatedUser,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.markAsRead(user.userId, messageId);
    return null;
  }

  @Patch('messages/:messageId')
  @ApiOperation({
    summary: '메시지 삭제',
    description:
      '특정 메시지를 삭제(soft delete) 처리합니다. 송신자/수신자만 가능하며, 성공 시 data는 null 입니다.',
  })
  @ApiParam({
    name: 'messageId',
    description: '삭제할 메시지 ID',
    example: 555,
  })
  @ApiOkResponse({
    description: '처리 성공',
    schema: {
      example: successExample('/api/v1/chats/messages/555', null),
    },
  })
  @ApiUnprocessableEntityResponse({
    description: '요청값이 유효하지 않음 (메시지 없음 등)',
  })
  @ApiForbiddenResponse({
    description: '권한 없음 (송신자/수신자가 아님 / 참여자가 아님 / 차단 상태)',
  })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async deleteMessage(
    @RequiredUser() user: AuthenticatedUser,
    @Param('messageId', new ParsePositiveIntPipe()) messageId: number,
  ) {
    await this.messageService.deleteMessage(user.userId, messageId);
    return null;
  }
}
