import { Test, TestingModule } from '@nestjs/testing';
import { VibeService } from './vibe.service';
import { VibeRepository } from '../repositories/vibe.repository';

const mockVibeRepository = {
  setUserInterests: jest.fn(),
  setUserPersonalities: jest.fn(),
  setUserIdealPersonalities: jest.fn(),
  listInterests: jest.fn(),
  listPersonalities: jest.fn(),
  listIdealPersonalities: jest.fn(),
};

describe('VibeService', () => {
  let service: VibeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VibeService, { provide: VibeRepository, useValue: mockVibeRepository }],
    }).compile();

    service = module.get<VibeService>(VibeService);
  });

  afterEach(() => jest.clearAllMocks());

  it('sets interests', () => {
    const dto = { userId: 1, interestIds: [1, 2] };
    service.setInterests(dto);
    expect(mockVibeRepository.setUserInterests).toHaveBeenCalledWith(1, [1, 2]);
  });

  it('lists personalities', () => {
    service.listPersonalities(1);
    expect(mockVibeRepository.listPersonalities).toHaveBeenCalledWith(1);
  });
});

