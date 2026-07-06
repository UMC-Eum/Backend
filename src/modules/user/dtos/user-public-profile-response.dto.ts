import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubCategory, Sex } from '@prisma/client';

class UserPublicProfileAreaDto {
  @ApiProperty({ example: '서울특별시 강남구' })
  name!: string;
}

class UserPublicProfileClubDto {
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

  @ApiPropertyOptional({
    example: '테스트용 동호회입니다.',
    nullable: true,
  })
  introText!: string | null;
}

export class UserPublicProfileResponseDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '홍길동' })
  nickname!: string;

  @ApiProperty({ example: 31 })
  age!: number;

  @ApiProperty({ enum: Sex, example: Sex.M })
  gender!: Sex;

  @ApiProperty({ type: UserPublicProfileAreaDto })
  area!: UserPublicProfileAreaDto;

  @ApiProperty({ example: '안녕하세요.' })
  introText!: string;

  @ApiProperty({ type: [String], example: ['등산', '독서'] })
  interests!: string[];

  @ApiProperty({ type: [String], example: ['차분한', '외향적인'] })
  idealPersonalities!: string[];

  @ApiProperty({ type: [UserPublicProfileClubDto] })
  participatingClubs!: UserPublicProfileClubDto[];

  @ApiProperty({ type: [UserPublicProfileClubDto] })
  hostingClubs!: UserPublicProfileClubDto[];

  @ApiProperty({
    example: true,
    description:
      '현재 로그인 사용자가 이 사용자에게 활성 좋아요를 보냈는지 여부',
  })
  hasSentHeart!: boolean;

  @ApiPropertyOptional({
    example: 101,
    nullable: true,
    description:
      '현재 로그인 사용자가 이 사용자에게 보낸 활성 하트 ID. 없으면 null',
  })
  sentHeartId!: number | null;

  @ApiProperty({ example: 'https://example.com/assets/profile.png' })
  profileImageUrl!: string;
}
