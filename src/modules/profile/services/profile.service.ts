import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from '../repositories/profile.repository';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(userId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }
}

