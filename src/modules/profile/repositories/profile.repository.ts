import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        photos: true,
        interests: true,
        idealPersonalities: true,
        personalities: true,
      },
    });
  }
}