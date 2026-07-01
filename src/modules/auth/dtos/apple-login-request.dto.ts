import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AppleLoginRequestDto {
  @ApiProperty({ example: 'apple_identity_token' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @ApiPropertyOptional({ example: 'apple_authorization_code' })
  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '홍길동' })
  @IsString()
  @IsOptional()
  name?: string;
}
