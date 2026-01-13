import { Module } from '@nestjs/common';
import { AuthLogoutController } from './controllers/auth-logout.controller';
import { AuthTokenController } from './controllers/auth-token.controller';
import { KakaoAuthController } from './controllers/kakao-auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthTokenService } from './services/auth-token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { KakaoAuthService } from './services/kakao-auth.service';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KakaoAuthController, AuthTokenController, AuthLogoutController],
  providers: [
    KakaoAuthService,
    AuthTokenService,
    JwtTokenService,
    AccessTokenGuard,
  ],
  exports: [JwtTokenService, AccessTokenGuard],
})
export class AuthModule {}
