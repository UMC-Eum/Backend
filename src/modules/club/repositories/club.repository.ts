import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clubId: bigint): Promise<{
    id: bigint;
    hostId: bigint | null;
    capacity: number;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, hostId: true, capacity: true, deletedAt: true },
    });
  }
}
