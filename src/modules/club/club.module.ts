import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { MeetingController } from './controllers/meeting/meeting.controller';
import { MeetingService } from './services/meeting/meeting.service';
import { ClubRepository } from './repositories/club.repository';
import { MeetingRepository } from './repositories/meeting.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingController],
  providers: [MeetingService, ClubRepository, MeetingRepository],
})
export class ClubModule {}
