import { PushPlatform } from '@prisma/client';
import { PushDeviceTokenService } from './push-device-token.service';
import { PushDeviceTokenRepository } from '../repositories/push-device-token.repository';

describe('PushDeviceTokenService', () => {
  const repository = {
    upsertToken: jest.fn(),
    revokeToken: jest.fn(),
  };
  let service: PushDeviceTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushDeviceTokenService(
      repository as unknown as PushDeviceTokenRepository,
    );
  });

  it('registers a push token', async () => {
    repository.upsertToken.mockResolvedValue({
      id: BigInt(1),
      platform: PushPlatform.IOS,
      lastSeenAt: new Date('2026-06-28T12:00:00.000Z'),
    });

    const result = await service.registerToken(10, {
      token: 'fcm-token',
      platform: PushPlatform.IOS,
      deviceId: 'device-id',
      appVersion: '1.0.0',
    });

    expect(repository.upsertToken).toHaveBeenCalledWith({
      userId: 10,
      token: 'fcm-token',
      platform: PushPlatform.IOS,
      deviceId: 'device-id',
      appVersion: '1.0.0',
    });
    expect(result).toEqual({
      tokenId: '1',
      platform: PushPlatform.IOS,
      lastSeenAt: '2026-06-28T12:00:00.000Z',
    });
  });

  it('revokes a push token', async () => {
    repository.revokeToken.mockResolvedValue({ count: 1 });

    await service.revokeToken(10, 'fcm-token');

    expect(repository.revokeToken).toHaveBeenCalledWith(10, 'fcm-token');
  });
});
