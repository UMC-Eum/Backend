import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  EmailSignupRequestDto,
  SendEmailVerificationCodeRequestDto,
  SendEmailVerificationCodeResponseDto,
  VerifyEmailCodeRequestDto,
  VerifyEmailCodeResponseDto,
} from '../dtos/email-auth.dto';
import { KakaoLoginResponseDto } from '../dtos/kakao-login-response.dto';
import { EmailAuthService } from '../services/email-auth.service';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/email')
export class EmailAuthController {
  constructor(
    private readonly emailAuthService: EmailAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send-code')
  @ApiOperation({ summary: 'Send email verification code' })
  @ApiBody({ type: SendEmailVerificationCodeRequestDto })
  @ApiOkResponse({ type: SendEmailVerificationCodeResponseDto })
  sendVerificationCode(
    @Body() body: SendEmailVerificationCodeRequestDto,
  ): Promise<SendEmailVerificationCodeResponseDto> {
    return this.emailAuthService.sendVerificationCode(body.email);
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Verify email verification code' })
  @ApiBody({ type: VerifyEmailCodeRequestDto })
  @ApiOkResponse({ type: VerifyEmailCodeResponseDto })
  verifyCode(
    @Body() body: VerifyEmailCodeRequestDto,
  ): Promise<VerifyEmailCodeResponseDto> {
    return this.emailAuthService.verifyCode(body.email, body.code);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Email signup' })
  @ApiBody({ type: EmailSignupRequestDto })
  @ApiOkResponse({
    type: KakaoLoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Sets refresh_token cookie',
      },
    },
  })
  async signup(
    @Body() body: EmailSignupRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<KakaoLoginResponseDto> {
    const { refreshToken, ...result } =
      await this.emailAuthService.signup(body);

    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }
}
