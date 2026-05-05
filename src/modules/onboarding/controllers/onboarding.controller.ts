import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import {
  CreateProfileRequestDto,
  CreateProfileResponseDto,
} from '../dtos/onboarding.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';

@ApiBearerAuth('access-token')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('profile')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '온보딩 프로필 등록',
    description:
      '프로필 텍스트/음성을 기반으로 FastAPI 분석을 수행한 뒤, 분석 결과와 함께 사용자 프로필을 저장합니다.',
  })
  @ApiBody({ type: CreateProfileRequestDto })
  @ApiOkResponse({ type: CreateProfileResponseDto })
  async createUserProfile(
    @RequiredUserId() userId: number,
    @Body() dto: CreateProfileRequestDto,
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
