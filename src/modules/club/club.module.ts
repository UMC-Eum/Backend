import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { MeetingController } from './controllers/meeting/meeting.controller';
import { MemberController } from './controllers/member/member.controller';
import { MeetingService } from './services/meeting/meeting.service';
import { ClubRepository } from './repositories/club.repository';
import { MeetingRepository } from './repositories/meeting.repository';
import { MemberRepository } from './repositories/member.repository';
import { MemberService } from './services/member/member.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingController, MemberController],
  providers: [MeetingService, MemberService, ClubRepository, MeetingRepository, MemberRepository],
})
export class ClubModule {}
