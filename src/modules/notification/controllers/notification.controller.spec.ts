import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from '../services/notification.service';
import { AccessTokenGuard } from '../../../modules/auth/guards/access-token.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  const serviceMock = {
    create: jest.fn(),
    markAsRead: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
