import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findRefreshTokenByHash(tokenHash: string) {
    return this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async rotateRefreshToken({
    userId,
    tokenHash,
    expiresAt,
  }: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prismaService.$transaction(
      async (tx) => {
        const existingToken = await tx.refreshToken.findUnique({
          where: { tokenHash },
        });

        if (existingToken) {
          return { created: false as const, revokedCount: 0 };
        }

        const revoked = await tx.refreshToken.updateMany({
          where: { userId: BigInt(userId), revokedAt: null },
          data: { revokedAt: new Date() },
        });

        await tx.refreshToken.create({
          data: {
            userId: BigInt(userId),
            tokenHash,
            expiresAt,
          },
        });

        return { created: true as const, revokedCount: revoked.count };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async revokeRefreshTokenByHash(tokenHash: string) {
    const result = await this.prismaService.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  async revokeAllUserTokens(userId: number) {
    const result = await this.prismaService.refreshToken.updateMany({
      where: { userId: BigInt(userId), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  createRefreshToken({
    userId,
    tokenHash,
    expiresAt,
  }: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prismaService.refreshToken.create({
      data: {
        userId: BigInt(userId),
        tokenHash,
        expiresAt,
      },
    });
  }
}
