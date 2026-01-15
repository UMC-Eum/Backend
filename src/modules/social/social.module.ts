import { Module } from '@nestjs/common';
import { HeartController } from './controllers/heart/heart.controller';
import { BlockController } from './controllers/block/block.controller';
import { ReportController } from './controllers/report/report.controller';
import { BlockService } from './services/block/block.service';
import { HeartService } from './services/heart/heart.service';
import { ReportService } from './services/report/report.service';
import { HeartRepository } from './repositories/heart.repository';
import { BlockRepository } from './repositories/block.repository';
import { ReportRepository } from './repositories/report.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HeartController, BlockController, ReportController],
  providers: [
    BlockService,
    HeartService,
    ReportService,
    HeartRepository,
    BlockRepository,
    ReportRepository,
  ],
})
export class SocialModule {}
