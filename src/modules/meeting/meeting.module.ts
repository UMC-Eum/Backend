import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ClubModule } from '../club/club.module';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MeetingRepository } from './repositories/meeting.repository';

@Module({
  imports: [AuthModule, PrismaModule, ClubModule],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingRepository],
})
export class MeetingModule {}
