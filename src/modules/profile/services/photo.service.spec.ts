import { Test, TestingModule } from '@nestjs/testing';
import { PhotoService } from './photo.service';
import { PhotoRepository } from '../repositories/photo.repository';
import { CreateUserPhotoDto } from '../dtos/create-user-photo.dto';
import { UpdateUserPhotoDto } from '../dtos/update-user-photo.dto';

const mockPhotoRepository = {
  create: jest.fn(),
  listByUser: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        { provide: PhotoRepository, useValue: mockPhotoRepository },
      ],
    }).compile();

    service = module.get<PhotoService>(PhotoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a photo', async () => {
    const dto: CreateUserPhotoDto = { userId: 1, url: 'foo' };
    mockPhotoRepository.create.mockResolvedValue('created');

    const result = await service.create(dto);

    expect(mockPhotoRepository.create).toHaveBeenCalledWith(dto);
    expect(result).toBe('created');
  });

  it('lists photos by user', async () => {
    mockPhotoRepository.listByUser.mockResolvedValue(['photo']);
    const result = await service.list(1);
    expect(mockPhotoRepository.listByUser).toHaveBeenCalledWith(1);
    expect(result).toEqual(['photo']);
  });

  it('updates after ensuring existence', async () => {
    const dto: UpdateUserPhotoDto = { url: 'bar' };
    mockPhotoRepository.findById.mockResolvedValue({ id: 1 });
    mockPhotoRepository.update.mockResolvedValue('updated');

    const result = await service.update(1, dto);

    expect(mockPhotoRepository.findById).toHaveBeenCalledWith(BigInt(1));
    expect(mockPhotoRepository.update).toHaveBeenCalledWith(BigInt(1), dto);
    expect(result).toBe('updated');
  });

  it('throws when photo missing', async () => {
    mockPhotoRepository.findById.mockResolvedValue(null);
    await expect(service.update(1, { url: 'x' })).rejects.toThrow();
  });
});

