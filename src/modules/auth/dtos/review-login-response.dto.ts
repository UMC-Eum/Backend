import { ApiProperty } from '@nestjs/swagger';

export class ReviewLoginUserDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'nickname', nullable: true })
  nickname: string | null;
}

export class ReviewLoginResponseDto {
  @ApiProperty({ example: 'jwt_access_token' })
  accessToken: string;

  @ApiProperty({ example: true })
  isNewUser: boolean;

  @ApiProperty({ example: true })
  onboardingRequired: boolean;

  @ApiProperty({ type: ReviewLoginUserDto })
  user: ReviewLoginUserDto;
}
