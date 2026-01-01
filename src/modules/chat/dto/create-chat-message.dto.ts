import { ChatMediaType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatMessageDto {
  @Type(() => Number)
  @IsNumber()
  roomId: number;

  @Type(() => Number)
  @IsNumber()
  sentById: number;

  @Type(() => Number)
  @IsNumber()
  sentToId: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  mediaUrl?: string;

  @IsOptional()
  @IsEnum(ChatMediaType)
  mediaType?: ChatMediaType;
}
