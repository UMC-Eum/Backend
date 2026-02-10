import { Module } from '@nestjs/common';
import { UserController } from './controllers/user/user.controller';
import { UserService } from './services/user/user.service';
import { UserRepository } from './repositories/user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
  imports: [AuthModule],
  exports: [UserService],
})
export class UserModule {}
