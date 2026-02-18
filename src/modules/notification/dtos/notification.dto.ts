import { Prisma, Notification, NotificationType } from '@prisma/client';
import { IsString, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type NotificationWithSender = Prisma.NotificationGetPayload<{
  include: { sentBy: true };
}>;

export class NotificationSenderDto {
  @ApiProperty({ example: '3' })
  @IsString()
  id: string;

  @ApiProperty({ example: '루씨' })
  @IsString()
  nickname: string;

  @ApiProperty({ example: 'https://cdn.example.com/profile.jpg' })
  @IsString()
  profileImageUrl: string;
}
export class NotificationResponseDto {
  @ApiProperty({ description: '알림 고유 ID', example: '1' })
  @IsString()
  notificationId: string;
  @ApiProperty({ description: '알림 타입', example: 'CHAT' })
  @IsEnum(NotificationType)
  type: NotificationType;
  @ApiProperty({ description: '알림 읽음 여부', example: false })
  @IsBoolean()
  isRead: boolean;
  @ApiProperty({
    description: '생성 시각',
    example: '2026-02-09T13:20:00.000Z',
  })
  @IsString()
  createdAt: string;
  @ApiProperty({ description: '알림 제목', example: '채팅이 도착했어요.' })
  @IsString()
  title: string;
  @ApiProperty({
    description: '알림 내용',
    example: '루씨님이 채팅을 보냈어요.',
  })
  @IsString()
  body: string;

  static from(entity: Notification): NotificationResponseDto {
    return {
      notificationId: entity.id.toString(),
      type: entity.type,
      title: entity.title,
      body: entity.body,
      isRead: entity.isRead,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}

export class NotificationWithSenderResponseDto {
  @ApiProperty({ description: '알림 고유 ID', example: '1' })
  @IsString()
  notificationId: string;
  @ApiProperty({ description: '알림 타입', example: 'CHAT' })
  @IsEnum(NotificationType)
  type: NotificationType;
  @ApiProperty({ description: '알림 읽음 여부', example: false })
  @IsBoolean()
  isRead: boolean;
  @ApiProperty({
    description: '생성 시각',
    example: '2026-02-09T13:20:00.000Z',
  })
  @IsString()
  createdAt: string;
  @ApiProperty({ description: '알림 제목', example: '채팅이 도착했어요.' })
  @IsString()
  title: string;
  @ApiProperty({
    description: '알림 내용',
    example: '루씨님이 채팅을 보냈어요.',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({ type: NotificationSenderDto })
  sender?: NotificationSenderDto;

  static from(
    this: void,
    entity: NotificationWithSender,
  ): NotificationWithSenderResponseDto {
    return {
      notificationId: entity.id.toString(),
      type: entity.type,
      title: entity.title,
      body: entity.body,
      isRead: entity.isRead,
      createdAt: entity.createdAt.toISOString(),
      sender: entity.sentBy
        ? {
            id: entity.sentBy.id.toString(),
            nickname: entity.sentBy.nickname,
            profileImageUrl: entity.sentBy.profileImageUrl,
          }
        : undefined,
    };
  }
}
