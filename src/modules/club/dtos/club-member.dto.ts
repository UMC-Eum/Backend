import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClubMemberRequestDto {
  @ApiProperty({
    example: '안녕하세요! 가입하고 싶습니다.',
    description: '호스트가 확인할 가입 신청 메시지',
    maxLength: 300,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  message!: string;
}

export class UpdateClubMemberStatusRequestDto {
  @ApiProperty({
    enum: [ClubUserStatus.ACTIVE, ClubUserStatus.REJECTED],
    example: ClubUserStatus.ACTIVE,
  })
  @IsIn([ClubUserStatus.ACTIVE, ClubUserStatus.REJECTED])
  status!: ClubUserStatus;
}

export class ClubMemberResponseDto {
  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ enum: ClubAuthority, example: ClubAuthority.GENERAL })
  authority!: ClubAuthority;

  @ApiProperty({ enum: ClubUserStatus, example: ClubUserStatus.PENDING })
  status!: ClubUserStatus;

  @ApiProperty({ example: '안녕하세요! 가입하고 싶습니다.' })
  message!: string;

  @ApiProperty({ example: '2026-05-01T15:40:00.000Z' })
  requestedAt!: string;

  @ApiProperty({ example: null, nullable: true })
  joinedAt!: string | null;
}

export class ClubMemberRequestItemDto extends ClubMemberResponseDto {
  @ApiProperty({ example: '홍길동' })
  nickname!: string;

  @ApiProperty({
    example: 'https://example.com/assets/profile-placeholder.png',
  })
  profileImageUrl!: string;

  @ApiProperty({ example: 50 })
  age!: number;

  @ApiProperty({ example: 'M' })
  sex!: string;
}

export class ClubMemberRequestListResponseDto {
  @ApiProperty({ type: [ClubMemberRequestItemDto] })
  items!: ClubMemberRequestItemDto[];
}

export class ClubMemberListItemDto {
  @ApiProperty({ example: 333 })
  clubUserId!: number;

  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ enum: ClubAuthority, example: ClubAuthority.GENERAL })
  authority!: ClubAuthority;

  @ApiProperty({ enum: ClubUserStatus, example: ClubUserStatus.ACTIVE })
  status!: ClubUserStatus;

  @ApiProperty({ example: '홍길동' })
  nickname!: string;

  @ApiProperty({
    example: 'https://example.com/assets/profile-placeholder.png',
  })
  profileImageUrl!: string;

  @ApiProperty({ example: 50 })
  age!: number;

  @ApiProperty({ example: 'M' })
  sex!: string;

  @ApiProperty({ example: '2026-05-02T15:40:00.000Z' })
  joinedAt!: string | null;
}

export class ClubMemberListResponseDto {
  @ApiProperty({ type: [ClubMemberListItemDto] })
  items!: ClubMemberListItemDto[];
}
