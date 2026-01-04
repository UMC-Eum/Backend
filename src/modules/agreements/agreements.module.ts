import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PolicyControllerTsController } from './controllers/policy.controller.ts.controller';
import { MarketingControllerTsController } from './controllers/marketing.controller.ts.controller';
import { MarketingService } from './services/marketing.service';
import { PolicyService } from './services/policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyControllerTsController, MarketingControllerTsController],
  providers: [MarketingService, PolicyService],
})
export class AgreementsModule {}
