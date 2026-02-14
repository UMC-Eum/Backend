import { Module } from '@nestjs/common';
import { AuthLogoutController } from './controllers/auth-logout.controller';
import { AuthTokenController } from './controllers/auth-token.controller';
import { KakaoAuthController } from './controllers/kakao-auth.controller';
import { ReviewAuthController } from './controllers/review-auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthTokenService } from './services/auth-token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { KakaoAuthService } from './services/kakao-auth.service';
import { ReviewAuthService } from './services/review-auth.service';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    KakaoAuthController,
    ReviewAuthController,
    AuthTokenController,
    AuthLogoutController,
  ],
  providers: [
    KakaoAuthService,
    ReviewAuthService,
    AuthTokenService,
    JwtTokenService,
    AccessTokenGuard,
  ],
  exports: [JwtTokenService, AccessTokenGuard],
})
export class AuthModule {}
