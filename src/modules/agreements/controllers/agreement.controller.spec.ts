import { Test, TestingModule } from '@nestjs/testing';
import { AgreementController } from './agreement.controller';
import { AccessTokenGuard } from '../../../modules/auth/guards/access-token.guard';
import { AgreementService } from '../services/agreement.service';

describe('AgreementController', () => {
  let controller: AgreementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgreementController],
      providers: [{ provide: AgreementService, useValue: {} }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AgreementController>(AgreementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
