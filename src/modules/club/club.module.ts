import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { MeetingController } from './controllers/meeting/meeting.controller';
import { MeetingService } from './services/meeting/meeting.service';
import { ClubMemberController } from './controllers/member/club-member.controller';
import { ClubMemberService } from './services/member/club-member.service';
import { ClubRepository } from './repositories/club.repository';
import { MeetingRepository } from './repositories/meeting.repository';
import { ClubMemberRepository } from './repositories/club-member.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingController, ClubMemberController],
  providers: [
    MeetingService,
    ClubMemberService,
    ClubRepository,
    MeetingRepository,
    ClubMemberRepository,
  ],
})
export class ClubModule {}
