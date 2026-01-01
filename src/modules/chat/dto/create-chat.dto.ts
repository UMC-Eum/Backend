import { ChatRoomStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatDto {
  @Type(() => Number)
  @IsNumber()
  ownerUserId: number;

  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  participantUserIds?: number[];
}
