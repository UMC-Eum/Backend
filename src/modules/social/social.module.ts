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
import { UserModule } from '../user/user.module';
import { BlockFilterInterceptor } from '../../common/interceptors/block-filter.interceptor';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [AuthModule, UserModule, PrismaModule],
  controllers: [HeartController, BlockController, ReportController],
  providers: [
    BlockService,
    HeartService,
    ReportService,
    HeartRepository,
    BlockRepository,
    ReportRepository,
    BlockFilterInterceptor,
  ],
})
export class SocialModule {}
