import {
  ClubAuthority,
  DayOfWeek,
  MeetingJoinPolicy,
  MeetingMemberStatus,
  RecurrenceType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'RecurrenceShape', async: false })
export class RecurrenceShapeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!value || typeof value !== 'object') return true;
    const r = value as RecurrenceInputDto;

    const hasWeekDays = r.daysOfWeek !== undefined && r.daysOfWeek !== null;
    const hasMonthDay = r.dayOfMonth !== undefined && r.dayOfMonth !== null;

    if (r.type !== RecurrenceType.WEEKLY && hasWeekDays) return false;
    if (r.type !== RecurrenceType.MONTHLY && hasMonthDay) return false;
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const r = args.value as RecurrenceInputDto | undefined;
    if (
      r?.type !== RecurrenceType.WEEKLY &&
      r?.daysOfWeek !== undefined &&
      r?.daysOfWeek !== null
    ) {
      return 'daysOfWeek는 type=WEEKLY일 때만 허용됩니다.';
    }
    return 'dayOfMonth는 type=MONTHLY일 때만 허용됩니다.';
  }
}

export class RecurrenceInputDto {
  @ApiProperty({ enum: RecurrenceType, example: RecurrenceType.WEEKLY })
  @IsEnum(RecurrenceType)
  type!: RecurrenceType;

  @ApiPropertyOptional({
    enum: DayOfWeek,
    isArray: true,
    example: [DayOfWeek.THU],
    description: 'WEEKLY일 때 필수 (1개 이상)',
  })
  @ValidateIf((o: RecurrenceInputDto) => o.type === RecurrenceType.WEEKLY)
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek?: DayOfWeek[];

  @ApiPropertyOptional({
    example: 15,
    description: 'MONTHLY일 때 필수 (1-31)',
  })
  @ValidateIf((o: RecurrenceInputDto) => o.type === RecurrenceType.MONTHLY)
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({ example: 19, description: '0-23 (KST)' })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiProperty({ example: 0, description: '0-59' })
  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number;
}

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

  @ApiProperty({ type: RecurrenceInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => RecurrenceInputDto)
  @Validate(RecurrenceShapeConstraint)
  recurrence!: RecurrenceInputDto;
}

export class UpdateMeetingRequestDto {
  @ApiPropertyOptional({ example: '매주하는 새벽등산', maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: '함께 새벽 산행할 분들 모집해요.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  introText?: string;

  @ApiPropertyOptional({ example: '종로역 1번 출구 앞', maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  spot?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    example: '1인 10,000원',
    nullable: true,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cost?: string | null;

  @ApiPropertyOptional({
    enum: MeetingJoinPolicy,
    example: MeetingJoinPolicy.AUTO,
  })
  @IsOptional()
  @IsEnum(MeetingJoinPolicy)
  joinPolicy?: MeetingJoinPolicy;

  @ApiPropertyOptional({ type: RecurrenceInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceInputDto)
  @Validate(RecurrenceShapeConstraint)
  recurrence?: RecurrenceInputDto;
}

export class RecurrenceDto {
  @ApiProperty({ enum: RecurrenceType, example: RecurrenceType.WEEKLY })
  type!: RecurrenceType;

  @ApiProperty({
    enum: DayOfWeek,
    isArray: true,
    nullable: true,
    example: [DayOfWeek.THU],
  })
  daysOfWeek!: DayOfWeek[] | null;

  @ApiProperty({ example: null, nullable: true })
  dayOfMonth!: number | null;

  @ApiProperty({ example: 19 })
  hour!: number;

  @ApiProperty({ example: 0 })
  minute!: number;
}

export class AttendeePreviewDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '루씨' })
  nickname!: string;

  @ApiProperty({ example: 'https://cdn.example.com/profile/42.jpg' })
  profileImageUrl!: string;
}

export class MeetingDetailDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ example: '매주하는 새벽등산🔥' })
  name!: string;

  @ApiProperty({ example: '등산화와 물을 꼭 지참해 주세요.' })
  introText!: string;

  @ApiProperty({ example: '종로역 1번 출구 앞' })
  spot!: string;

  @ApiPropertyOptional({ example: '1인 30,000원', nullable: true })
  cost!: string | null;

  @ApiProperty({ example: 8 })
  capacity!: number;

  @ApiProperty({ example: 4 })
  attendeeCount!: number;

  @ApiProperty({ enum: MeetingJoinPolicy, example: MeetingJoinPolicy.AUTO })
  joinPolicy!: MeetingJoinPolicy;

  @ApiProperty({ example: true })
  isRegular!: boolean;

  @ApiProperty({ example: true })
  isAttending!: boolean;

  @ApiProperty({ type: RecurrenceDto })
  recurrence!: RecurrenceDto;

  @ApiProperty({ example: '매주 목요일 오후 7시' })
  dateLabel!: string;

  @ApiProperty({ example: '2026-12-12T19:00:00+09:00' })
  nextOccurrenceAt!: string;

  @ApiProperty({ type: [AttendeePreviewDto] })
  attendeesPreview!: AttendeePreviewDto[];

  @ApiProperty({ example: '2026-04-20T10:00:00+09:00' })
  createdAt!: string;

  @ApiProperty({ example: null, nullable: true })
  updatedAt!: string | null;
}

export class CreateMeetingResponseDto extends MeetingDetailDto {}

export class GetMeetingDetailResponseDto extends MeetingDetailDto {}

export class UpdateMeetingResponseDto extends MeetingDetailDto {}

export class DeleteMeetingResponseDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 10 })
  clubId!: number;

  @ApiProperty({ example: '2026-05-31T12:00:00+09:00' })
  deletedAt!: string;
}

export class JoinMeetingResponseDto {
  @ApiProperty({ example: 5001 })
  meetingMemberId!: number;

  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({
    enum: MeetingMemberStatus,
    example: MeetingMemberStatus.ACTIVE,
    description: 'AUTO 정모는 ACTIVE(즉시 참석), 승인정모는 PENDING(승인 대기)',
  })
  status!: MeetingMemberStatus;

  @ApiProperty({
    example: '2026-05-01T20:05:00+09:00',
    nullable: true,
    description: '참석 확정 시각. 승인 대기(PENDING)면 null',
  })
  joinedAt!: string | null;
}

export class UpdateAttendeeStatusRequestDto {
  @ApiProperty({
    enum: [MeetingMemberStatus.ACTIVE, MeetingMemberStatus.REJECTED],
    example: MeetingMemberStatus.ACTIVE,
    description: '승인: ACTIVE, 거절: REJECTED',
  })
  @IsIn([MeetingMemberStatus.ACTIVE, MeetingMemberStatus.REJECTED])
  status!: MeetingMemberStatus;
}

export class UpdateAttendeeStatusResponseDto {
  @ApiProperty({ example: 5001 })
  meetingMemberId!: number;

  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({
    enum: MeetingMemberStatus,
    example: MeetingMemberStatus.ACTIVE,
  })
  status!: MeetingMemberStatus;

  @ApiProperty({
    example: '2026-05-01T20:05:00+09:00',
    nullable: true,
    description: '승인(ACTIVE) 시각. 거절(REJECTED)이면 null',
  })
  joinedAt!: string | null;
}

export class LeaveMeetingResponseDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '2026-05-01T20:10:00+09:00' })
  canceledAt!: string;
}

export class ListAttendeesQueryDto {
  @ApiPropertyOptional({ description: 'opaque cursor (base64url)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ example: 30, minimum: 1, maximum: 100, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class AttendeeUserDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '달콤한목소리' })
  nickname!: string;

  @ApiProperty({ example: 'https://cdn.example.com/profile/42.jpg' })
  profileImageUrl!: string;

  @ApiProperty({ enum: ClubAuthority, example: ClubAuthority.GENERAL })
  authority!: ClubAuthority;
}

export class AttendeeItemDto {
  @ApiProperty({ example: 5001 })
  meetingMemberId!: number;

  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ type: AttendeeUserDto })
  user!: AttendeeUserDto;

  @ApiProperty({ example: '2026-05-01T20:05:00+09:00' })
  joinedAt!: string;
}

export class ListAttendeesResponseDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ example: 14 })
  attendeeCount!: number;

  @ApiProperty({ type: [AttendeeItemDto] })
  attendees!: AttendeeItemDto[];

  @ApiProperty({
    example:
      'eyJqb2luZWRBdCI6IjIwMjYtMDUtMDFUMjA6MDc6MDArMDk6MDAiLCJpZCI6IjUwMDIifQ',
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class MeetingRequestItemDto {
  @ApiProperty({ example: 5001 })
  meetingMemberId!: number;

  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ type: AttendeeUserDto })
  user!: AttendeeUserDto;

  @ApiProperty({ example: '참석하고 싶습니다!' })
  joinMessage!: string;

  @ApiProperty({ example: '2026-05-01T20:05:00+09:00' })
  requestedAt!: string;
}

export class MeetingRequestListResponseDto {
  @ApiProperty({ example: 88 })
  meetingId!: number;

  @ApiProperty({ type: [MeetingRequestItemDto] })
  requests!: MeetingRequestItemDto[];
}
