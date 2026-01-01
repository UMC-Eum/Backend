import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  body?: string;

  @IsOptional()
  type?: NotificationType;
}
