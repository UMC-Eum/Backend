import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FileUploadService } from './services/files.service';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingRepository } from './repositories/onboarding.repository';
import { MatchesService } from './services/matches.service';
import { MatchesController } from './controllers/matches.controller';
import { MatchesRepository } from './repositories/matches.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FilesController, OnboardingController, MatchesController],
  providers: [
    FileUploadService,
    OnboardingService,
    OnboardingRepository,
    MatchesService,
    MatchesRepository,
  ],
})
export class OnboardingModule {}
