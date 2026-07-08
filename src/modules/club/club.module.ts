import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ClubController } from './controllers/club/club.controller';
import { ClubSearchController } from './controllers/club/club-search.controller';
import { MeetingController } from './controllers/meeting/meeting.controller';
import { ClubService } from './services/club/club.service';
import { RecentClubSearchService } from './services/club/recent-club-search.service';
import { MeetingService } from './services/meeting/meeting.service';
import { ClubMemberController } from './controllers/member/club-member.controller';
import { ClubMemberService } from './services/member/club-member.service';
import { ClubRepository } from './repositories/club.repository';
import { MeetingRepository } from './repositories/meeting.repository';
import { ClubMemberRepository } from './repositories/club-member.repository';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    UserModule,
    OnboardingModule,
    NotificationModule,
  ],
  controllers: [
    ClubController,
    ClubSearchController,
    MeetingController,
    ClubMemberController,
  ],
  providers: [
    ClubService,
    RecentClubSearchService,
    MeetingService,
    ClubRepository,
    MeetingRepository,
    ClubMemberService,
    ClubMemberRepository,
  ],
  exports: [ClubRepository],
})
export class ClubModule {}
