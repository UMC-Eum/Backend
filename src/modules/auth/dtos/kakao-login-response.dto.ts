import { ApiProperty } from '@nestjs/swagger';

export class KakaoLoginUserDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'nickname', nullable: true })
  nickname: string | null;
}

export class KakaoLoginResponseDto {
  @ApiProperty({ example: 'jwt_access_token' })
  accessToken: string;

  @ApiProperty({ example: true })
  isNewUser: boolean;

  @ApiProperty({ example: true })
  onboardingRequired: boolean;

  @ApiProperty({ type: KakaoLoginUserDto })
  user: KakaoLoginUserDto;
}
