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
