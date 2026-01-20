import { Test, TestingModule } from '@nestjs/testing';
import { BlockService } from './block.service';
import { BlockRepository } from '../../repositories/block.repository';

describe('BlockService', () => {
  let service: BlockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: BlockRepository,
          useValue: {
            createBlock: jest.fn(),
            removeBlock: jest.fn(),
            getBlockedUsers: jest.fn(),
            findBlockRelationship: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
