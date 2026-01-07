import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { OnboardingService } from '../../services/onboarding/onboarding.service';
import { CreateProfileDto } from '../../dtos/onboarding.dto';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_CODE } from '../../../../common/errors/error-codes';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('profile')
  async createUserProfile(@Body() dto: CreateProfileDto) {
    try {
      const userId = 1; // TODO: 실제 userId 받기
      await this.onboardingService.createUserProfile(userId, dto);
      return {
        statusCode: HttpStatus.OK,
        message: '프로필이 성공적으로 저장되었습니다.',
      };
    } catch (err) {
      throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, {
        code: ERROR_CODE.COMMON_INTERNAL_ERROR,
        message: '프로필 저장 실패',
      });
    }
  }
}