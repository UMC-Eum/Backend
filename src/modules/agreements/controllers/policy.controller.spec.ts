import { Test, TestingModule } from '@nestjs/testing';
import { PolicyControllerTsController } from './policy.controller.ts.controller';

describe('PolicyController', () => {
  let controller: PolicyControllerTsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyControllerTsController],
    }).compile();

    controller = module.get<PolicyControllerTsController>(
      PolicyControllerTsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
