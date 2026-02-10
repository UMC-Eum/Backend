import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUser } from '../../../auth/decorators/required-user.decorator';
import type { AuthenticatedUser } from '../../../auth/decorators/auth-user.types';

import { CreateChatMediaPresignDto } from '../../dtos/chat-media.dto';
import { ChatMediaService } from '../../services/chat-media/chat-media.service';

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
export class ChatMediaController {
  constructor(private readonly chatMediaService: ChatMediaService) {}

  @Post('rooms/:chatRoomId/media/presign')
  @ApiOperation({
    summary: '채팅 미디어 업로드용 presigned URL 발급',
    description:
      '채팅방에 첨부할 미디어(음성/사진/동영상) 업로드용 presigned URL을 발급합니다. 참여자만 발급할 수 있습니다.',
  })
  @ApiParam({
    name: 'chatRoomId',
    description: '채팅방 ID',
    example: 101,
  })
  @ApiOkResponse({
    description: '발급 성공',
    schema: {
      example: successExample('/api/v1/chats/rooms/101/media/presign', {
        uploadUrl:
          'https://bucket.s3.ap-northeast-2.amazonaws.com/chat/101/1/....',
        mediaRef: 's3://eum-chat-media/chat/101/1/....',
        key: 'chat/101/1/....',
        expiresAt: '2026-02-10T00:05:00.000Z',
        requiredHeaders: { 'Content-Type': 'image/jpeg' },
      }),
    },
  })
  @ApiForbiddenResponse({ description: '권한 없음 (채팅방 참여자가 아님)' })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async presignChatMedia(
    @RequiredUser() user: AuthenticatedUser,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
    @Body() dto: CreateChatMediaPresignDto,
  ) {
    return this.chatMediaService.createUploadPresign(
      user.userId,
      chatRoomId,
      dto,
    );
  }
}
