import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMediaType } from '@prisma/client';

export class AttachMediaDto {
  @Type(() => Number)
  @IsNumber()
  messageId: number;

  @IsEnum(ChatMediaType)
  type: ChatMediaType;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  text?: string;
}

