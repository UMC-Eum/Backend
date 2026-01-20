import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUser } from '../../../auth/decorators/required-user.decorator';
import type { AuthenticatedUser } from '../../../auth/decorators/auth-user.types';

import { CreateRoomDto, ListRoomsQueryDto } from '../../dtos/room.dto';
import { RoomService } from '../../services/room/room.service';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('chats/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(
    @RequiredUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.createRoom(user.userId, dto.targetUserId);
  }

  @Get()
  async listRooms(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: ListRoomsQueryDto,
  ) {
    return this.roomService.listRooms(user.userId, query);
  }

  @Get(':chatRoomId')
  async getRoomDetail(
    @RequiredUser() user: AuthenticatedUser,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
  ) {
    return this.roomService.getRoomDetail(user.userId, chatRoomId);
  }
}
