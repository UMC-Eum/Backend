import { Injectable } from '@nestjs/common';
import { OnboardingRepository } from '../repositories/onboarding.repository';
import {
  AnalyzeClubVibeRequestDto,
  AnalyzeClubVibeResponseDto,
  CreateProfileDto,
  CreateProfileRequestDto,
  CreateProfileResponseDto,
} from '../dtos/onboarding.dto';
import { OnboardingAiService } from './onboarding-ai.service';
import { AppException } from '../../../common/errors/app.exception';
import { ClubRepository } from '../../club/repositories/club.repository';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly onboardingAiService: OnboardingAiService,
    private readonly clubRepository: ClubRepository,
  ) {}

  async createUserProfile(
    userId: number,
    dto: CreateProfileRequestDto,
  ): Promise<CreateProfileResponseDto> {
    const analysis = await this.onboardingAiService.analyzeProfile(userId, dto);
    const profileDto: CreateProfileDto = {
      ...dto,
      introText: analysis.transcript,
      selectedKeywords: analysis.selectedKeywords,
      vibeVector: analysis.vibeVector,
    };

    await this.onboardingRepository.updateUserProfile(userId, profileDto);

    return {
      userId,
      matchedKeywords: analysis.matchedKeywords,
      summary: analysis.summary,
      transcript: analysis.transcript,
      profileCompleted: true,
    };
  }

  async analyzeClubVibe(
    userId: number,
    dto: AnalyzeClubVibeRequestDto,
  ): Promise<AnalyzeClubVibeResponseDto> {
    const clubId = BigInt(dto.clubId);
    const club = await this.clubRepository.findById(clubId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }
    if (club.hostId !== BigInt(userId)) {
      throw new AppException('CLUB_FORBIDDEN_NOT_HOST');
    }

    const analysis = await this.onboardingAiService.analyzeClubVibe(dto);
    await this.onboardingRepository.updateClubVibe(
      clubId,
      dto,
      analysis.selectedKeywords,
      analysis.vibeVector,
    );

    return {
      clubId: Number(clubId),
      transcript: analysis.transcript,
      summary: analysis.summary,
      vectorId: analysis.vectorId,
      matchedKeywords: analysis.matchedKeywords,
      vibeVector: analysis.vibeVector,
      clubUpdated: true,
    };
  }
}
