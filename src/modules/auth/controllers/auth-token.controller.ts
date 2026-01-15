import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenRefreshResponseDto } from '../dtos/token-refresh-response.dto';
import { AuthTokenService } from '../services/auth-token.service';
import {
  buildRefreshTokenCookieOptions,
  extractRefreshToken,
} from '../utils/refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth/token')
export class AuthTokenController {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCookieAuth('refresh_token')
  @ApiHeader({
    name: 'Cookie',
    description: 'refresh_token cookie is required',
    required: true,
  })
  @ApiOkResponse({
    type: TokenRefreshResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'Rotated refresh_token cookie',
      },
    },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenRefreshResponseDto> {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const { accessToken, refreshToken: nextRefreshToken } =
      await this.authTokenService.refreshTokens(refreshToken);

    res.cookie(
      'refresh_token',
      nextRefreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return { accessToken };
  }
}
