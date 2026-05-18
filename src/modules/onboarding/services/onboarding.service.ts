import { Injectable } from '@nestjs/common';
import { OnboardingRepository } from '../repositories/onboarding.repository';
import {
  CreateProfileDto,
  CreateProfileRequestDto,
  CreateProfileResponseDto,
} from '../dtos/onboarding.dto';
import { OnboardingAiService } from './onboarding-ai.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly onboardingAiService: OnboardingAiService,
  ) {}

  async createUserProfile(
    userId: number,
    dto: CreateProfileRequestDto,
  ): Promise<CreateProfileResponseDto> {
    const analysis = await this.onboardingAiService.analyzeProfile(userId, dto);
    const profileDto: CreateProfileDto = {
      ...dto,
      selectedKeywords: analysis.selectedKeywords,
      vibeVector: analysis.vibeVector,
    };

    await this.onboardingRepository.updateUserProfile(userId, profileDto);

    return {
      userId,
      profileCompleted: true,
    };
  }
}
