import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateChatMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  text?: string;

  @IsOptional()
  @IsBoolean()
  markDeleted?: boolean;
}
