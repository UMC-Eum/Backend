import { Injectable } from '@nestjs/common';
import { OnboardingRepository } from '../../repositories/onboarding.repository';
import { CreateProfileDto } from '../../dtos/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  async createUserProfile(userId: number, dto: CreateProfileDto): Promise<void> {

    await this.onboardingRepository.updateUserProfile(userId, dto);
  }
}