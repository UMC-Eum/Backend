import { Controller, Logger, Post, Req, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthTokenService } from '../services/auth-token.service';
import {
  buildRefreshTokenCookieOptions,
  extractRefreshToken,
} from '../utils/refresh-token-cookie';
import { error } from 'console';

@ApiTags('Auth')
@Controller('auth')
export class AuthLogoutController {
  private readonly logger = new Logger(AuthLogoutController.name);
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) {}

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiCookieAuth('refresh_token')
  @ApiHeader({
    name: 'Cookie',
    description: 'refresh_token cookie is optional',
    required: false,
  })
  @ApiOkResponse({
    schema: { example: null },
    headers: {
      'Set-Cookie': {
        description: 'Clears refresh_token cookie',
      },
    },
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<null> {
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      try {
        await this.authTokenService.logout(refreshToken);
      } catch {
        this.logger.warn('Failed to revoke refresh token during logout.', {
          error,
        });
      }
    }

    res.clearCookie(
      'refresh_token',
      buildRefreshTokenCookieOptions(this.configService),
    );

    return null;
  }
}
