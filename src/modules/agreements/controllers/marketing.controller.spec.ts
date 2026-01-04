import { Test, TestingModule } from '@nestjs/testing';
import { MarketingControllerTsController } from './marketing.controller.ts.controller';

describe('MarketingController', () => {
  let controller: MarketingControllerTsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingControllerTsController],
    }).compile();

    controller = module.get<MarketingControllerTsController>(
      MarketingControllerTsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
