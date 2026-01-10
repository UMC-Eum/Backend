import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AgreementController } from './controllers/agreement.controller';
import { AgreementService } from './services/agreement.service';
import { AgreementRepository } from './repositories/agreement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AgreementController],
  providers: [AgreementService, AgreementRepository],
})
export class AgreementModule {}
