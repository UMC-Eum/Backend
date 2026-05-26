import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class MemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClub(clubId: bigint) {
    return this.prisma.club.findUnique({ where: { id: clubId } });
  }

  findClubUser(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.findUnique({ where: { userId_clubId: { userId, clubId } } });
  }

  findTargetMember(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.findUnique({ where: { userId_clubId: { clubId, userId } } });
  }

  async createOrRejoin(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.upsert({
      where: { userId_clubId: { userId, clubId } },
      create: { clubId, userId, status: 'PENDING', authority: 'GENERAL' },
      update: { status: 'PENDING', leftAt: null },
    });
  }

  async listMembers(clubId: bigint, status: ClubUserStatus, cursor?: bigint, limit = 30) {
    const rows = await this.prisma.clubUser.findMany({
      where: { clubId, status },
      include: {
        user: { select: { nickname: true, profileImageUrl: true } },
        clubUserBadges: { include: { badge: true }, take: 5, orderBy: { id: 'asc' } },
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasNext ? String(items[items.length - 1]?.id ?? '') : null,
    };
  }

  updateStatus(clubId: bigint, userId: bigint, status: ClubUserStatus) {
    return this.prisma.clubUser.update({
      where: { userId_clubId: { clubId, userId } },
      data: status === 'ACTIVE' ? { status, leftAt: null } : { status },
    });
  }

  async leaveOwn(clubId: bigint, userId: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clubUser.update({
        where: { userId_clubId: { clubId, userId } },
        data: { leftAt: new Date(), status: 'REJECTED' },
      });

      const activeCount = await tx.clubUser.count({
        where: { clubId, status: 'ACTIVE', leftAt: null },
      });

      let clubDeleted = false;
      if (activeCount === 0) {
        await tx.club.update({ where: { id: clubId }, data: { deletedAt: new Date() } });
        clubDeleted = true;
      }

      return { updated, clubDeleted };
    });
  }

  kick(clubId: bigint, userId: bigint) {
    return this.prisma.clubUser.update({
      where: { userId_clubId: { clubId, userId } },
      data: { leftAt: new Date(), status: 'REJECTED' },
    });
  }

  updateAuthority(clubId: bigint, userId: bigint, authority: ClubAuthority) {
    return this.prisma.clubUser.update({ where: { userId_clubId: { clubId, userId } }, data: { authority } });
  }
}
