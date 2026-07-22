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

  findLocalAuthAccountByUsername(username: string) {
    return this.prismaService.localAuthAccount.findUnique({
      where: { username },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        user: {
          select: {
            id: true,
            nickname: true,
            status: true,
            deletedAt: true,
          },
        },
      },
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

  createEmailVerification({
    email,
    codeHash,
    purpose,
    expiresAt,
  }: {
    email: string;
    codeHash: string;
    purpose: string;
    expiresAt: Date;
  }) {
    return this.prismaService.emailVerification.create({
      data: {
        email,
        codeHash,
        purpose,
        expiresAt,
      },
    });
  }

  findLatestPendingEmailVerification({
    email,
    purpose,
  }: {
    email: string;
    purpose: string;
  }) {
    return this.prismaService.emailVerification.findFirst({
      where: {
        email,
        purpose,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        codeHash: true,
        attemptCount: true,
        expiresAt: true,
      },
    });
  }

  incrementEmailVerificationAttempt(id: bigint) {
    return this.prismaService.emailVerification.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  }

  markEmailVerificationVerified(id: bigint, verifiedAt: Date) {
    return this.prismaService.emailVerification.update({
      where: { id },
      data: { verifiedAt },
    });
  }

  findActiveUserByEmail(email: string) {
    return this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  findLatestReusableVerifiedEmailVerification({
    email,
    purpose,
    verifiedAfter,
  }: {
    email: string;
    purpose: string;
    verifiedAfter: Date;
  }) {
    return this.prismaService.emailVerification.findFirst({
      where: {
        email,
        purpose,
        verifiedAt: { gte: verifiedAfter },
        consumedAt: null,
      },
      orderBy: { verifiedAt: 'desc' },
      select: { id: true },
    });
  }

  async createEmailUserWithLocalAccount({
    email,
    passwordHash,
    verificationId,
  }: {
    email: string;
    passwordHash: string;
    verificationId: bigint;
  }) {
    const defaultNickname = `email_${email.split('@')[0].slice(0, 13)}`;

    return this.prismaService.$transaction(
      async (tx) => {
        const insertedUsers = await tx.$queryRaw<Array<{ id: bigint }>>(
          Prisma.sql`
            INSERT INTO "User" (
              "birthdate",
              "email",
              "nickname",
              "updatedAt",
              "introVoiceUrl",
              "introText",
              "profileImageUrl",
              "code",
              "provider",
              "providerUserId",
              "vibeVector"
            )
            VALUES (
              ${new Date('1900-01-01T00:00:00.000Z')},
              ${email},
              ${defaultNickname},
              NOW(),
              ${'https://example.com/assets/intro-voice-placeholder.mp3'},
              ${''},
              ${'https://example.com/assets/profile-placeholder.png'},
              ${null},
              ${'LOCAL'}::"AuthProvider",
              ${email},
              '[0]'::vector
            )
            RETURNING "id"
          `,
        );
        const userId = insertedUsers[0].id;

        await tx.localAuthAccount.create({
          data: {
            username: email,
            passwordHash,
            userId,
          },
        });

        await tx.emailVerification.update({
          where: { id: verificationId },
          data: { consumedAt: new Date() },
        });

        return {
          id: userId,
          nickname: defaultNickname,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
