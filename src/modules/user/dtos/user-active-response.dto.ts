import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sex } from '@prisma/client';

export class ActiveUserDto {
  @ApiProperty({ example: 42 })
  userId!: number;

  @ApiProperty({ example: '루씨' })
  nickname!: string;

  @ApiProperty({ enum: Sex, example: Sex.F })
  gender!: Sex;

  @ApiProperty({ example: 53 })
  age!: number;

  @ApiProperty({ example: '서울특별시 강남구', nullable: true })
  areaName!: string | null;

  @ApiProperty({ example: '안녕하세요.' })
  introText!: string;

  @ApiProperty({ example: 'https://cdn.example.com/files/profile.jpg' })
  profileImageUrl!: string;

  @ApiProperty({ example: '2026-07-07T06:30:00.000Z' })
  lastActiveAt!: string;
}

export class ActiveUsersPageDto {
  @ApiProperty({ example: 20 })
  size!: number;

  @ApiProperty({ example: false })
  hasNext!: boolean;

  @ApiPropertyOptional({
    example:
      'eyJsYXN0QWN0aXZlQXQiOiIyMDI2LTA3LTA3VDA2OjMwOjAwLjAwMFoiLCJ1c2VySWQiOjQyfQ',
    nullable: true,
  })
  nextCursor!: string | null;
}

export class ActiveUsersResponseDto {
  @ApiProperty({ type: [ActiveUserDto] })
  items!: ActiveUserDto[];

  @ApiProperty({ type: ActiveUsersPageDto })
  page!: ActiveUsersPageDto;
}
