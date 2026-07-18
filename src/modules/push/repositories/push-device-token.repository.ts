import { Injectable } from '@nestjs/common';
import { PushPlatform } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class PushDeviceTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertToken(params: {
    userId: number;
    token: string;
    platform: PushPlatform;
    deviceId?: string;
    appVersion?: string;
  }) {
    const now = new Date();

    return this.prisma.pushDeviceToken.upsert({
      where: { token: params.token },
      update: {
        userId: BigInt(params.userId),
        platform: params.platform,
        deviceId: params.deviceId,
        appVersion: params.appVersion,
        lastSeenAt: now,
        revokedAt: null,
      },
      create: {
        userId: BigInt(params.userId),
        token: params.token,
        platform: params.platform,
        deviceId: params.deviceId,
        appVersion: params.appVersion,
        lastSeenAt: now,
      },
    });
  }

  revokeToken(userId: number, token: string) {
    return this.prisma.pushDeviceToken.updateMany({
      where: {
        userId: BigInt(userId),
        token,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  findActiveTokensByUserId(userId: number) {
    return this.prisma.pushDeviceToken.findMany({
      where: {
        userId: BigInt(userId),
        revokedAt: null,
      },
      select: {
        token: true,
      },
    });
  }

  revokeTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.pushDeviceToken.updateMany({
      where: {
        token: { in: tokens },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
