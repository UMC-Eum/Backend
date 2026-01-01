import { Injectable, NotFoundException } from '@nestjs/common';
import { PhotoRepository } from '../repositories/photo.repository';
import { CreateUserPhotoDto } from '../dtos/create-user-photo.dto';
import { UpdateUserPhotoDto } from '../dtos/update-user-photo.dto';

@Injectable()
export class PhotoService {
  constructor(private readonly photoRepository: PhotoRepository) {}

  create(dto: CreateUserPhotoDto) {
    return this.photoRepository.create(dto);
  }

  list(userId: number) {
    return this.photoRepository.listByUser(userId);
  }

  async update(id: number, dto: UpdateUserPhotoDto) {
    await this.ensureExists(id);
    return this.photoRepository.update(BigInt(id), dto);
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.photoRepository.softDelete(BigInt(id));
  }

  private async ensureExists(id: number) {
    const photo = await this.photoRepository.findById(BigInt(id));
    if (!photo) throw new NotFoundException('User photo not found');
  }
}

