import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FileUploadService } from './services/files.service'
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';
import { MatchesService } from './services/matches.service';
import { MatchesController } from './controllers/matches.controller';

@Module({
  controllers: [FilesController, OnboardingController, MatchesController],
  providers: [FileUploadService, OnboardingService, MatchesService],
})
export class OnboardingModule {}
