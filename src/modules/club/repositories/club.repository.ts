import { Injectable } from '@nestjs/common';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
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

  // 클럽 채팅방 표시용 기본 정보.
  async findClubBasic(clubId: bigint): Promise<{
    id: bigint;
    name: string;
    thumbnailUrl: string | null;
    hostId: bigint | null;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        hostId: true,
        deletedAt: true,
      },
    });
  }

  // 채팅방 목록 표시용 배치 조회.
  async findClubBriefsByIds(
    clubIds: bigint[],
  ): Promise<Array<{ id: bigint; name: string; thumbnailUrl: string | null }>> {
    if (clubIds.length === 0) return [];
    return this.prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, name: true, thumbnailUrl: true },
    });
  }

  async findActiveClubUser(
    userId: bigint,
    clubId: bigint,
  ): Promise<{ id: bigint; authority: ClubAuthority } | null> {
    return this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId,
        status: ClubUserStatus.ACTIVE,
        leftAt: null,
      },
      select: { id: true, authority: true },
    });
  }
}
