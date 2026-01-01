import { Injectable } from '@nestjs/common';
import { ActiveStatus } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserStatusService {
  constructor(private readonly userRepository: UserRepository) {}

  changeStatus(id: number, status: ActiveStatus) {
    return this.userRepository.updateStatus(id, status);
  }
}
