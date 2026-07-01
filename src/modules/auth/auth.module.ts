import { Module } from '@nestjs/common';
import { AuthLogoutController } from './controllers/auth-logout.controller';
import { AuthTokenController } from './controllers/auth-token.controller';
import { AppleAuthController } from './controllers/apple-auth.controller';
import { KakaoAuthController } from './controllers/kakao-auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthTokenService } from './services/auth-token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { AppleAuthService } from './services/apple-auth.service';
import { KakaoAuthService } from './services/kakao-auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    AppleAuthController,
    KakaoAuthController,
    AuthTokenController,
    AuthLogoutController,
  ],
  providers: [
    AppleAuthService,
    KakaoAuthService,
    AuthTokenService,
    JwtTokenService,
    AccessTokenGuard,
    AuthRepository,
    UserRepository,
  ],
  exports: [JwtTokenService, AccessTokenGuard],
})
export class AuthModule {}
