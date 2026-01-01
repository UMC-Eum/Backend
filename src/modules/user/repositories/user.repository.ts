import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { ActiveStatus } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  softDelete(id: number) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  updateStatus(id: number, status: ActiveStatus) {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }
}
