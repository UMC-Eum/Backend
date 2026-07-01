import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { AppleLoginRequestDto } from '../dtos/apple-login-request.dto';
import { AppleLoginResponseDto } from '../dtos/apple-login-response.dto';
import { AppleAuthService } from '../services/apple-auth.service';
import { buildRefreshTokenCookieOptions } from '../utils/refresh-token-cookie';
import { AppException } from '../../../common/errors/app.exception';

const APPLE_AUTH_STATE_COOKIE = 'apple_auth_state';

type AppleCallbackBody = {
  code?: string;
  id_token?: string;
  state?: string;
  user?: string;
};

type AppleFormPostUser = {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

@ApiTags('Auth')
@Controller('auth/apple')
export class AppleAuthController {
  constructor(
    private readonly appleAuthService: AppleAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('authorize')
  @ApiOperation({ summary: 'Apple web login redirect for local testing' })
  authorize(@Res() res: Response): void {
    this.assertWebLoginEnabled();

    const clientId = this.getAppleWebClientId();
    const redirectUri = this.getAppleRedirectUri();
    const state = randomBytes(32).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    });

    res.cookie(
      APPLE_AUTH_STATE_COOKIE,
      state,
      this.buildAppleStateCookieOptions(),
    );
    res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  }

  @Post('callback')
  @ApiOperation({
    summary: 'Apple web login form_post callback for local testing',
  })
  async callback(
    @Body() body: AppleCallbackBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppleLoginResponseDto> {
    this.assertWebLoginEnabled();
    this.assertValidState(body.state, this.extractStateCookie(req));

    if (!body.id_token) {
      throw new AppException('AUTH_APPLE_TOKEN_INVALID');
    }

    const appleUser = this.parseAppleUser(body.user);
    const { refreshToken, ...result } =
      await this.appleAuthService.loginWithApple(
        {
          identityToken: body.id_token,
          authorizationCode: body.code,
          email: appleUser?.email,
          name: this.buildAppleUserName(appleUser),
        },
        this.getAppleWebClientId(),
      );

    res.clearCookie(
      APPLE_AUTH_STATE_COOKIE,
      this.buildAppleStateCookieOptions(),
    );
    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshTokenCookieOptions(this.configService),
    );

    return result;
  }

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

  private assertWebLoginEnabled(): void {
    if (
      this.configService.get<string>('APPLE_WEB_LOGIN_ENABLED', 'false') !==
      'true'
    ) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple web login is disabled.',
      });
    }
  }

  private getAppleWebClientId(): string {
    const clientId =
      this.configService.get<string>('APPLE_WEB_CLIENT_ID') ??
      this.configService.get<string>('APPLE_CLIENT_ID');

    if (!clientId) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple web client ID is not configured.',
      });
    }

    return clientId;
  }

  private getAppleRedirectUri(): string {
    const redirectUri = this.configService.get<string>('APPLE_REDIRECT_URI');

    if (!redirectUri) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'Apple redirect URI is not configured.',
      });
    }

    return redirectUri;
  }

  private buildAppleStateCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/v1/auth/apple/callback',
      maxAge: 10 * 60 * 1000,
    };
  }

  private extractStateCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;

    return cookies?.[APPLE_AUTH_STATE_COOKIE];
  }

  private assertValidState(
    callbackState: string | undefined,
    cookieState: string | undefined,
  ): void {
    if (!callbackState || !cookieState || callbackState !== cookieState) {
      throw new AppException('AUTH_APPLE_TOKEN_INVALID', {
        message: 'Apple login state is invalid.',
      });
    }
  }

  private parseAppleUser(user: string | undefined): AppleFormPostUser | null {
    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as AppleFormPostUser;
    } catch {
      return null;
    }
  }

  private buildAppleUserName(
    user: AppleFormPostUser | null,
  ): string | undefined {
    const parts = [user?.name?.lastName, user?.name?.firstName].filter(
      (part): part is string => Boolean(part?.trim()),
    );

    return parts.length > 0 ? parts.join('') : undefined;
  }
}
