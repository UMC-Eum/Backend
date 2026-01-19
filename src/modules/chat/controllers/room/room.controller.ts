import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { DevUserId } from '../../../../common/decorators/dev-user-id.decorator';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

import { CreateRoomDto, ListRoomsQueryDto } from '../../dtos/room.dto';
import { RoomService } from '../../services/room/room.service';

@ApiTags('Chats')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'DEV ONLY(Auth 전): 내 userId (예: x-user-id: 1)',
})
@Controller('chats/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@DevUserId() meUserId: number, @Body() dto: CreateRoomDto) {
    return this.roomService.createRoom(meUserId, dto.targetUserId);
  }

  @Get()
  async listRooms(
    @DevUserId() meUserId: number,
    @Query() query: ListRoomsQueryDto,
  ) {
    return this.roomService.listRooms(meUserId, query);
  }

  @Get(':chatRoomId')
  async getRoomDetail(
    @DevUserId() meUserId: number,
    @Param('chatRoomId', new ParsePositiveIntPipe()) chatRoomId: number,
  ) {
    return this.roomService.getRoomDetail(meUserId, chatRoomId);
  }
}
