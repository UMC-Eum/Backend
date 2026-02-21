import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ReviewAuthService } from '../services/review-auth.service';
import { ReviewLoginRequestDto } from '../dtos/review-login-request.dto';
import { ReviewLoginResponseDto } from '../dtos/review-login-response.dto';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/review')
export class ReviewAuthController {
  constructor(
    private readonly reviewAuthService: ReviewAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Review login' })
  @ApiBody({ type: ReviewLoginRequestDto })
  @ApiOkResponse({
    type: ReviewLoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Sets refresh_token cookie',
      },
    },
  })
  async login(
    @Body() body: ReviewLoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReviewLoginResponseDto> {
    const { refreshToken, ...result } =
      await this.reviewAuthService.loginWithReview(body);

    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }
}
