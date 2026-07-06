import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUser } from '../../../auth/decorators/required-user.decorator';
import type { AuthenticatedUser } from '../../../auth/decorators/auth-user.types';

import { ClubChatService } from '../../services/club-chat/club-chat.service';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('chats/clubs')
export class ClubChatController {
  constructor(private readonly clubChatService: ClubChatService) {}

  @Post(':clubId/room')
  @ApiOperation({
    summary: '클럽 채팅방 입장',
    description:
      '클럽 채팅방에 입장합니다. 방이 없으면 생성하고, 내 참여자(ChatParticipant) 기록이 없으면 생성합니다. ACTIVE 클럽 멤버만 입장할 수 있습니다. 멱등이며, created=true면 이번 호출로 처음 입장한 것입니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '입장할 클럽 ID',
    example: 7,
  })
  @ApiCreatedResponse({ description: '입장(또는 기존 방 반환) 성공' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  @ApiForbiddenResponse({ description: '권한 없음 (ACTIVE 클럽 멤버가 아님)' })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async enterClubRoom(
    @RequiredUser() user: AuthenticatedUser,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ) {
    return this.clubChatService.enterClubRoom(user.userId, clubId);
  }
}
