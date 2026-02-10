import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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

import { CreateRoomDto, ListRoomsQueryDto } from '../../dtos/room.dto';
import { RoomService } from '../../services/room/room.service';

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
@Controller('chats/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({
    summary: '채팅방 생성',
    description:
      'targetUserId와의 1:1 채팅방을 생성합니다. 이미 존재하는 방이 있으면 기존 방을 반환하며 created=false 입니다.',
  })
  @ApiCreatedResponse({
    description: '생성(또는 기존 방 반환) 성공',
    schema: {
      example: successExample('/api/v1/chats/rooms', {
        chatRoomId: 101,
        created: true,
        peer: {
          userId: 9,
          nickname: '상대방',
          profileImageUrl: 'https://cdn.example.com/profile/9.jpg',
        },
      }),
    },
  })
  @ApiUnprocessableEntityResponse({
    description:
      '요청값이 유효하지 않음 (예: 자기 자신과 채팅방 생성 / 상대 사용자 없음)',
  })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async createRoom(
    @RequiredUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.createRoom(user.userId, dto.targetUserId);
  }

  @Get()
  @ApiOperation({
    summary: '채팅방 목록 조회',
    description:
      '내가 참여 중인 채팅방 목록을 최신 메시지 기준으로 조회합니다. 커서 기반 페이지네이션(cursor/size)을 지원합니다.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '커서(base64url). 이전 페이지의 nextCursor를 전달합니다.',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '가져올 아이템 수 (기본 20, 최대 50)',
    example: 20,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: successExample('/api/v1/chats/rooms?size=20', {
        nextCursor:
          'eyJzb3J0QXQiOiIyMDI2LTAyLTEwVDAwOjAwOjAwLjAwMFoiLCJyb29tSWQiOiIxMDEifQ',
        items: [
          {
            chatRoomId: 101,
            peer: {
              userId: 9,
              nickname: '상대방',
              profileImageUrl: 'https://cdn.example.com/profile/9.jpg',
              areaName: '서울특별시 강남구',
            },
            lastMessage: {
              type: 'TEXT',
              textPreview: '안녕하세요!',
              sentAt: '2026-02-10T00:00:00.000Z',
            },
            unreadCount: 1,
          },
        ],
      }),
    },
  })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async listRooms(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: ListRoomsQueryDto,
  ) {
    return this.roomService.listRooms(user.userId, query);
  }

  @Get(':chatRoomId')
  @ApiOperation({
    summary: '채팅방 상세 조회',
    description:
      '채팅방 ID로 상대방 프로필(닉네임/나이/지역/프로필 이미지)을 조회합니다. 참여자만 조회할 수 있습니다.',
  })
  @ApiParam({
    name: 'chatRoomId',
    description: '조회할 채팅방 ID',
    example: 101,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: successExample('/api/v1/chats/rooms/101', {
        chatRoomId: 101,
        peer: {
          userId: 9,
          nickname: '상대방',
          age: 27,
          areaName: '서울특별시 강남구',
          profileImageUrl: 'https://cdn.example.com/profile/9.jpg',
        },
      }),
    },
  })
  @ApiForbiddenResponse({ description: '권한 없음 (채팅방 참여자가 아님)' })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
  async getRoomDetail(
    @RequiredUser() user: AuthenticatedUser,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
  ) {
    return this.roomService.getRoomDetail(user.userId, chatRoomId);
  }
}
