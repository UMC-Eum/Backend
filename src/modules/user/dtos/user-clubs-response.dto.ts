import { ClubAuthority, ClubCategory, ClubUserStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserClubItemDto {
  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ example: '테스트 동호회' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/assets/club-thumbnail.png',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ enum: ClubCategory, example: ClubCategory.OTHERS })
  category!: ClubCategory;

  @ApiProperty({ example: 30 })
  capacity!: number;

  @ApiPropertyOptional({
    example: '1168000000',
    nullable: true,
    description: '동호회 지역 코드',
  })
  code!: string | null;

  @ApiPropertyOptional({
    example: '1168000000',
    nullable: true,
    description: '동호회 지역 코드',
  })
  addressCode!: string | null;

  @ApiPropertyOptional({
    example: '테스트용 동호회입니다.',
    nullable: true,
  })
  introText!: string | null;

  @ApiProperty({ example: 8 })
  memberCount!: number;

  @ApiProperty({ enum: ClubAuthority, example: ClubAuthority.GENERAL })
  authority!: ClubAuthority;

  @ApiProperty({ enum: ClubUserStatus, example: ClubUserStatus.PENDING })
  status!: ClubUserStatus;

  @ApiPropertyOptional({
    example: '2026-05-02T15:40:00.000Z',
    nullable: true,
  })
  joinedAt!: string | null;
}

export class UserClubsResponseDto {
  @ApiProperty({ type: [UserClubItemDto] })
  items!: UserClubItemDto[];
}

export class UserLikedClubItemDto {
  @ApiProperty({ example: 12 })
  clubId!: number;

  @ApiProperty({ example: '테스트 동호회' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/assets/club-thumbnail.png',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ enum: ClubCategory, example: ClubCategory.OTHERS })
  category!: ClubCategory;

  @ApiProperty({ example: 30 })
  capacity!: number;

  @ApiPropertyOptional({
    example: '1168000000',
    nullable: true,
    description: '동호회 지역 코드',
  })
  code!: string | null;

  @ApiPropertyOptional({
    example: '1168000000',
    nullable: true,
    description: '동호회 지역 코드',
  })
  addressCode!: string | null;

  @ApiPropertyOptional({
    example: '테스트용 동호회입니다.',
    nullable: true,
  })
  introText!: string | null;

  @ApiProperty({ example: 8 })
  memberCount!: number;

  @ApiProperty({ example: '2026-05-02T15:40:00.000Z' })
  likedAt!: string;
}

export class UserLikedClubsResponseDto {
  @ApiProperty({ type: [UserLikedClubItemDto] })
  items!: UserLikedClubItemDto[];
}
