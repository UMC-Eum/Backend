import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
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
    const normalizedToken = dto.token.trim();

    if (!normalizedToken) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        details: { field: 'token' },
      });
    }

    const token = await this.pushDeviceTokenRepository.upsertToken({
      userId,
      token: normalizedToken,
      platform: dto.platform,
      deviceId: dto.deviceId?.trim() || undefined,
      appVersion: dto.appVersion?.trim() || undefined,
    });

    return {
      tokenId: token.id.toString(),
      platform: token.platform,
      lastSeenAt: token.lastSeenAt.toISOString(),
    };
  }

  async revokeToken(userId: number, token: string): Promise<void> {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        details: { field: 'token' },
      });
    }

    await this.pushDeviceTokenRepository.revokeToken(userId, normalizedToken);
  }
}
