import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sex } from '@prisma/client';

export class UserVisitorItemDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '홍길동' })
  nickname!: string;

  @ApiProperty({ enum: Sex, example: Sex.M })
  gender!: Sex;

  @ApiProperty({ example: 28 })
  age!: number;

  @ApiPropertyOptional({
    example: '서울특별시 강남구',
    nullable: true,
  })
  areaName!: string | null;

  @ApiPropertyOptional({
    example: '안녕하세요.',
    nullable: true,
  })
  introText!: string | null;

  @ApiProperty({
    example: 'https://example.com/assets/profile.png',
  })
  profileImageUrl!: string;

  @ApiProperty({ example: '2026-05-02T15:40:00.000Z' })
  visitedAt!: string;
}

export class UserVisitorsResponseDto {
  @ApiPropertyOptional({
    example:
      'eyJ2aXNpdGVkQXQiOiIyMDI2LTA1LTAyVDE1OjQwOjAwLjAwMFoiLCJ1c2VySWQiOiI0MiJ9',
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ type: [UserVisitorItemDto] })
  items!: UserVisitorItemDto[];
}
