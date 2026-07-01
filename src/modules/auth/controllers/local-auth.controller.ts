import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocalLoginRequestDto } from '../dtos/local-login-request.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { LocalAuthService } from '../services/local-auth.service';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/local')
export class LocalAuthController {
  constructor(
    private readonly localAuthService: LocalAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Local login' })
  @ApiBody({ type: LocalLoginRequestDto })
  @ApiOkResponse({
    type: KakaoLoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Sets refresh_token cookie',
      },
    },
  })
  async login(
    @Body() body: LocalLoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<KakaoLoginResponseDto> {
    const { refreshToken, ...result } = await this.localAuthService.login(body);

    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }
}
