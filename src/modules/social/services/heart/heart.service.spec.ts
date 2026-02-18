import { Test, TestingModule } from '@nestjs/testing';
import { HeartService } from './heart.service';
import { HeartRepository } from '../../repositories/heart.repository';
import { NotificationService } from '../../../notification/services/notification.service';
import { UserService } from '../../../user/services/user/user.service';

describe('HeartService', () => {
  let service: HeartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeartService,
        {
          provide: HeartRepository,
          useValue: {
            postHeart: jest.fn(),
            deleteHeart: jest.fn(),
            getReceivedHearts: jest.fn(),
            getSentHearts: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getMe: jest.fn().mockResolvedValue({ nickname: 'TestUser' }),
          },
        },
      ],
    }).compile();

    service = module.get<HeartService>(HeartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
