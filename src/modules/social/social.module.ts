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
import { BlockFilterInterceptor } from '../../common/interceptors/block-filter.interceptor';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/services/notification.service';
import { NotificationRepository } from '../notification/repositories/notification.repository';
import { UserService } from '../user/services/user/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AuthModule, PrismaModule, NotificationModule, UserModule],
  controllers: [HeartController, BlockController, ReportController],
  providers: [
    BlockService,
    HeartService,
    ReportService,
    HeartRepository,
    BlockRepository,
    ReportRepository,
    BlockFilterInterceptor,
    NotificationService,
    NotificationRepository,
    UserService,
    UserRepository,
  ],
})
export class SocialModule {}
