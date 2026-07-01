import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppleLoginRequestDto } from '../dtos/apple-login-request.dto';
import { AppleLoginResponseDto } from '../dtos/apple-login-response.dto';
import { AppleAuthService } from '../services/apple-auth.service';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/apple')
export class AppleAuthController {
  constructor(
    private readonly appleAuthService: AppleAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Apple login' })
  @ApiBody({ type: AppleLoginRequestDto })
  @ApiOkResponse({
    type: AppleLoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Sets refresh_token cookie',
      },
    },
  })
  async login(
    @Body() body: AppleLoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppleLoginResponseDto> {
    const { refreshToken, ...result } =
      await this.appleAuthService.loginWithApple(body);

    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }
}
