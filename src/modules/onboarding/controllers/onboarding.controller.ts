import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import { CreateProfileDto } from '../dtos/onboarding.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiBody } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';

@ApiBearerAuth('access-token')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('profile')
  @UseGuards(AccessTokenGuard)
  @ApiBody({ type: CreateProfileDto })
  async createUserProfile(
    @RequiredUserId() userId: number,
    @Body() dto: CreateProfileDto,
  ) {
    try {
      const result = await this.onboardingService.createUserProfile(
        userId,
        dto,
      );

      return result;
    } catch (err) {
      throw new AppException('PROFILE_NOT_REGISTERED', {
        details: err,
      });
    }
  }
}
