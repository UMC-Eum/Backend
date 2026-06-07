import { MeetingJoinPolicy } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMeetingRequestDto {
  @ApiProperty({ example: '매주하는 새벽등산', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '함께 새벽 산행할 분들 모집해요.', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  introText!: string;

  @ApiProperty({ example: '매주 목요일 저녁 19시', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  date!: string;

  @ApiProperty({ example: '종로역 1번 출구 앞', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  spot!: string;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({
    example: '1인 10,000원',
    nullable: true,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cost?: string;

  @ApiProperty({ enum: MeetingJoinPolicy, example: MeetingJoinPolicy.AUTO })
  @IsEnum(MeetingJoinPolicy)
  joinPolicy!: MeetingJoinPolicy;
}

export class CreateMeetingResponseDto {
  @ApiProperty({ example: 1 })
  meetingId!: number;

  @ApiProperty({ example: 10 })
  clubId!: number;

  @ApiProperty({ example: '매주하는 새벽등산' })
  name!: string;

  @ApiProperty({ example: '함께 새벽 산행할 분들 모집해요.' })
  introText!: string;

  @ApiProperty({ example: '매주 목요일 저녁 19시' })
  date!: string;

  @ApiProperty({ example: '종로역 1번 출구 앞' })
  spot!: string;

  @ApiProperty({ example: 15 })
  capacity!: number;

  @ApiPropertyOptional({ example: '1인 10,000원', nullable: true })
  cost!: string | null;

  @ApiProperty({ enum: MeetingJoinPolicy, example: MeetingJoinPolicy.AUTO })
  joinPolicy!: MeetingJoinPolicy;

  @ApiProperty({ example: true })
  isRegular!: boolean;

  @ApiProperty({ example: 0 })
  attendeeCount!: number;

  @ApiProperty({ example: '2026-05-31T12:00:00.000Z' })
  createdAt!: string;
}

export class DeleteMeetingResponseDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 10 })
  clubId!: number;

  @ApiProperty({ example: '2026-05-31T12:00:00.000Z' })
  deletedAt!: string;
}
