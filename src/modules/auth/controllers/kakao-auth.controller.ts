import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { KakaoAuthService } from '../services/kakao-auth.service';
import { KakaoLoginRequestDto } from '../dtos/kakao-login-request.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/kakao')
export class KakaoAuthController {
  constructor(
    private readonly kakaoAuthService: KakaoAuthService,
    private readonly configService: ConfigService,
  ) {}
  @Post('login')
  @ApiOperation({ summary: 'Kakao login' })
  @ApiBody({ type: KakaoLoginRequestDto })
  @ApiOkResponse({
    type: KakaoLoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Sets refresh_token cookie',
      },
    },
  })
  async login(
    @Body() body: KakaoLoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<KakaoLoginResponseDto> {
    const { refreshToken, ...result } =
      await this.kakaoAuthService.loginWithKakao(body);

    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }

  @Get('callback')
  kakaoCallback(@Query('code') code: string) {
    void code;
    return 'OK';
  }
}
