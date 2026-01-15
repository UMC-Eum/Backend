import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoLoginRequestDto {
  @ApiProperty({ example: 'authorization_code' })
  @IsString()
  @IsNotEmpty()
  authorizationCode!: string;

  @ApiProperty({ example: 'http://localhost:3000/api/v1/auth/kakao/callback' })
  @IsString()
  @IsNotEmpty()
  redirectUri!: string;
}
