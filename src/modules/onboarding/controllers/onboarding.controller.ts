import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import { CreateProfileDto } from '../dtos/onboarding.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('profile')
  async createUserProfile(@RequiredUserId() userId: number, @Body() dto: CreateProfileDto) {
    try {
      const result = await this.onboardingService.createUserProfile(userId, dto);

      return result;
    } catch (err) {
      throw new AppException('PROFILE_NOT_REGISTERED', {
        details: err,
      });
    }
  }
}
