import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import {
  ClubController,
  UserClubController,
} from './controllers/club/club.controller';
import { MeetingController } from './controllers/meeting/meeting.controller';
import { ClubService } from './services/club/club.service';
import { MeetingService } from './services/meeting/meeting.service';
import { ClubRepository } from './repositories/club.repository';
import { MeetingRepository } from './repositories/meeting.repository';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [AuthModule, PrismaModule, UserModule, OnboardingModule],
  controllers: [ClubController, UserClubController, MeetingController],
  providers: [ClubService, MeetingService, ClubRepository, MeetingRepository],
})
export class ClubModule {}
