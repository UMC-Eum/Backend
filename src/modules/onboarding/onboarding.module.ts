import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FileUploadService } from './services/files.service';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingRepository } from './repositories/onboarding.repository';
import { MatchesService } from './services/matches.service';
import { MatchesController } from './controllers/matches.controller';
import { AuthModule } from '../auth/auth.module';
import { OnboardingAiService } from './services/onboarding-ai.service';
import { ClubRepository } from '../club/repositories/club.repository';

@Module({
  imports: [AuthModule],
  controllers: [FilesController, OnboardingController, MatchesController],
  providers: [
    FileUploadService,
    OnboardingService,
    OnboardingAiService,
    OnboardingRepository,
    MatchesService,
    ClubRepository,
  ],
  exports: [OnboardingAiService],
})
export class OnboardingModule {}
