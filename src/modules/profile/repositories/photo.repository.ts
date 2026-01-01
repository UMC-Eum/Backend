import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateUserPhotoDto } from '../dtos/create-user-photo.dto';
import { UpdateUserPhotoDto } from '../dtos/update-user-photo.dto';

@Injectable()
export class PhotoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUserPhotoDto) {
    return this.prisma.userPhoto.create({ data: { userId: BigInt(dto.userId), url: dto.url } });
  }

  findById(id: bigint) {
    return this.prisma.userPhoto.findUnique({ where: { id } });
  }

  listByUser(userId: number) {
    return this.prisma.userPhoto.findMany({
      where: { userId: BigInt(userId), deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: bigint, dto: UpdateUserPhotoDto) {
    return this.prisma.userPhoto.update({ where: { id }, data: dto });
  }

  softDelete(id: bigint) {
    return this.prisma.userPhoto.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
