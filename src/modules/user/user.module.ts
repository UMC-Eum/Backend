import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserStatusService } from './services/user-status.service';
import { UserRepository } from './repositories/user.repository';

@Module({
  controllers: [UserController],
  providers: [UserService, UserStatusService, UserRepository],
  exports: [UserService, UserStatusService],
})
export class UserModule {}
