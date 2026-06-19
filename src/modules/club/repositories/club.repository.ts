import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clubId: bigint): Promise<{
    id: bigint;
    hostId: bigint | null;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, hostId: true, deletedAt: true },
    });
  }

  async findActiveClubUser(
    userId: bigint,
    clubId: bigint,
  ): Promise<{ id: bigint } | null> {
    return this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId,
        status: 'ACTIVE',
        leftAt: null,
      },
      select: { id: true },
    });
  }
}
