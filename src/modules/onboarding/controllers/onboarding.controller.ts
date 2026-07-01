import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import {
  AnalyzeClubVibeRequestDto,
  AnalyzeClubVibeResponseDto,
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
      '자기소개 음성 URL을 기반으로 FastAPI 분석을 수행한 뒤, 분석 결과와 함께 사용자 프로필을 저장합니다. introText는 요청으로 받지 않고 FastAPI가 반환한 transcript를 저장합니다. 응답에는 FastAPI 분석 결과 중 vibeVector와 vectorId를 제외한 matchedKeywords, summary, transcript를 반환합니다.',
  })
  @ApiBody({
    type: CreateProfileRequestDto,
    examples: {
      default: {
        summary: '온보딩 프로필 등록 요청',
        value: {
          nickname: '루씨',
          gender: 'F',
          birthDate: '1972-03-01',
          areaCode: '1168000000',
          introAudioUrl: 'https://cdn.example.com/onboarding/intro-101.m4a',
        },
      },
    },
  })
  @ApiOkResponse({
    type: CreateProfileResponseDto,
    description:
      '프로필 저장 성공. vibeVector는 서버에 저장하지만 응답에는 포함하지 않습니다.',
    schema: {
      example: {
        userId: 101,
        matchedKeywords: [
          {
            category: 'PERSONALITY',
            id: 21,
            keyword: '차분함',
            score: 0.86,
          },
        ],
        summary: '조용한 공간에서 독서와 산책을 즐기는 차분한 성향입니다.',
        transcript:
          '저는 조용한 카페에서 책 읽는 걸 좋아하고, 주말에는 가볍게 산책하는 편입니다.',
        profileCompleted: true,
      },
    },
  })
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
      if (err instanceof AppException) {
        throw err;
      }

      throw new AppException('PROFILE_NOT_REGISTERED', {
        details: err,
      });
    }
  }

  @Post('club-vibe/analyze')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '동호회 바이브 분석',
    description:
      '동호회 소개 텍스트/음성을 FastAPI로 분석한 뒤, 클럽 vibeVector와 키워드를 저장합니다.',
  })
  @ApiBody({
    type: AnalyzeClubVibeRequestDto,
    examples: {
      default: {
        summary: '동호회 바이브 분석 요청',
        value: {
          analysis_type: 'profile',
          clubId: 12,
          transcript:
            '저희 모임은 퇴근 후 가볍게 러닝하고 서로 기록을 공유하는 분위기입니다.',
        },
      },
    },
  })
  @ApiOkResponse({
    type: AnalyzeClubVibeResponseDto,
    description:
      '동호회 바이브 분석 성공. FastAPI 분석 결과를 반환하고 vibeVector는 클럽에 저장합니다.',
    schema: {
      example: {
        clubId: 12,
        matchedKeywords: [
          {
            category: 'ACTIVITY',
            id: 3,
            keyword: '활동적',
            score: 0.82,
          },
        ],
        summary: '퇴근 후 러닝 기록을 공유하는 활동적인 모임입니다.',
        transcript:
          '저희 모임은 퇴근 후 가볍게 러닝하고 서로 기록을 공유하는 분위기입니다.',
        vectorId: '12',
        vibeVector: [0.12, -0.04, 0.31],
      },
    },
  })
  async analyzeClubVibe(
    @RequiredUserId() userId: number,
    @Body() dto: AnalyzeClubVibeRequestDto,
  ): Promise<AnalyzeClubVibeResponseDto> {
    return this.onboardingService.analyzeClubVibe(userId, dto);
  }
}
