import { Module } from '@nestjs/common';
import { AuthLogoutController } from './controllers/auth-logout.controller';
import { AuthTokenController } from './controllers/auth-token.controller';
import { AppleAuthController } from './controllers/apple-auth.controller';
import { EmailAuthController } from './controllers/email-auth.controller';
import { KakaoAuthController } from './controllers/kakao-auth.controller';
import { LocalAuthController } from './controllers/local-auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthTokenService } from './services/auth-token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { AppleAuthService } from './services/apple-auth.service';
import { EmailAuthService } from './services/email-auth.service';
import { KakaoAuthService } from './services/kakao-auth.service';
import { LocalAuthService } from './services/local-auth.service';
import { MailService } from './services/mail.service';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    AppleAuthController,
    EmailAuthController,
    KakaoAuthController,
    LocalAuthController,
    AuthTokenController,
    AuthLogoutController,
  ],
  providers: [
    AppleAuthService,
    EmailAuthService,
    KakaoAuthService,
    LocalAuthService,
    MailService,
    AuthTokenService,
    JwtTokenService,
    AccessTokenGuard,
    AuthRepository,
    UserRepository,
  ],
  exports: [
    JwtTokenService,
    AccessTokenGuard,
    AppleAuthService,
    KakaoAuthService,
  ],
})
export class AuthModule {}
