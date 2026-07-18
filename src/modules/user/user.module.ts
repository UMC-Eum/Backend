import { Module } from '@nestjs/common';
import { UserController } from './controllers/user/user.controller';
import { UserService } from './services/user/user.service';
import { UserActivityService } from './services/user/user-activity.service';
import { UserRepository } from './repositories/user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UserController],
  providers: [UserService, UserActivityService, UserRepository],
  imports: [AuthModule],
  exports: [UserRepository, UserActivityService],
})
export class UserModule {}
