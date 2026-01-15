import { ApiProperty } from '@nestjs/swagger';

export class TokenRefreshResponseDto {
  @ApiProperty({ example: 'jwt_access_token' })
  accessToken: string;
}
