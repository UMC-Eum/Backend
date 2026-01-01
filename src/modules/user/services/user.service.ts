import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findOne(id: number) {
    return this.userRepository.findOne(id);
  }

  update(id: number, dto: UpdateUserDto) {
    return this.userRepository.update(id, dto);
  }

  softDelete(id: number) {
    return this.userRepository.softDelete(id);
  }
}

