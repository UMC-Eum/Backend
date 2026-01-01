import { Test, TestingModule } from '@nestjs/testing';
import { PhotoController } from './photo.controller';
import { PhotoService } from '../services/photo.service';

const mockPhotoService = {
  create: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('PhotoController', () => {
  let controller: PhotoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotoController],
      providers: [{ provide: PhotoService, useValue: mockPhotoService }],
    }).compile();

    controller = module.get<PhotoController>(PhotoController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates creation', () => {
    controller.create({ userId: 1, url: 'x' });
    expect(mockPhotoService.create).toHaveBeenCalled();
  });
});

