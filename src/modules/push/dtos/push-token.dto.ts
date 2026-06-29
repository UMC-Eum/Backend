import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PushPlatform } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging registration token',
    example: 'fcm-registration-token',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;

  @ApiProperty({ enum: PushPlatform, example: PushPlatform.IOS })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @ApiPropertyOptional({
    description: '클라이언트에서 식별하는 디바이스 ID',
    example: 'ios-device-id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

export class RevokePushTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging registration token',
    example: 'fcm-registration-token',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}

export class PushTokenResponseDto {
  @ApiProperty({ example: '1' })
  tokenId!: string;

  @ApiProperty({ enum: PushPlatform, example: PushPlatform.IOS })
  platform!: PushPlatform;

  @ApiProperty({ example: '2026-06-28T12:00:00.000Z' })
  lastSeenAt!: string;
}
