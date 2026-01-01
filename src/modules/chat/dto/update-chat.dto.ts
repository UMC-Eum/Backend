import { IsEnum, IsOptional } from 'class-validator';
import { ChatRoomStatus } from '@prisma/client';

export class UpdateChatDto {
  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;
}
