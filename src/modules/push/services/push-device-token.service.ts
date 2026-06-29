import { Injectable } from '@nestjs/common';
import {
  PushTokenResponseDto,
  RegisterPushTokenDto,
} from '../dtos/push-token.dto';
import { PushDeviceTokenRepository } from '../repositories/push-device-token.repository';

@Injectable()
export class PushDeviceTokenService {
  constructor(
    private readonly pushDeviceTokenRepository: PushDeviceTokenRepository,
  ) {}

  async registerToken(
    userId: number,
    dto: RegisterPushTokenDto,
  ): Promise<PushTokenResponseDto> {
    const token = await this.pushDeviceTokenRepository.upsertToken({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId,
      appVersion: dto.appVersion,
    });

    return {
      tokenId: token.id.toString(),
      platform: token.platform,
      lastSeenAt: token.lastSeenAt.toISOString(),
    };
  }

  async revokeToken(userId: number, token: string): Promise<void> {
    await this.pushDeviceTokenRepository.revokeToken(userId, token);
  }
}
