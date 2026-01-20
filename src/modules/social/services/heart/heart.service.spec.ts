import { Test, TestingModule } from '@nestjs/testing';
import { HeartService } from './heart.service';
import { HeartRepository } from '../../repositories/heart.repository';

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
      ],
    }).compile();

    service = module.get<HeartService>(HeartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
