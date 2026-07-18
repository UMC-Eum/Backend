import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountRequestDto {
  @ApiPropertyOptional({
    description:
      'Apple 로그인 사용자가 탈퇴할 때 Apple 재인증으로 받은 authorization code',
    example: 'apple_authorization_code',
  })
  @IsString()
  @IsOptional()
  appleAuthorizationCode?: string;
}
