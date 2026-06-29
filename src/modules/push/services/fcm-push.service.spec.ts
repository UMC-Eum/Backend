import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { BatchResponse, MulticastMessage } from 'firebase-admin/messaging';
import { FcmPushService } from './fcm-push.service';
import { PushDeviceTokenRepository } from '../repositories/push-device-token.repository';

const sendEachForMulticastMock = jest.fn();

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn((credential: unknown) => credential),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({
    sendEachForMulticast: sendEachForMulticastMock,
  })),
}));

function batchResponse(params: {
  successCount: number;
  failureCount: number;
  errorCodes?: Array<string | null>;
}): BatchResponse {
  return {
    successCount: params.successCount,
    failureCount: params.failureCount,
    responses:
      params.errorCodes?.map((code, index) =>
        code
          ? {
              success: false,
              error: {
                code,
                message: `error-${index}`,
                name: 'FirebaseError',
                hasCode: (targetCode: string) => targetCode === code,
                toJSON: () => ({ code, message: `error-${index}` }),
              },
            }
          : { success: true, messageId: `message-${index}` },
      ) ?? [],
  };
}

describe('FcmPushService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        FIREBASE_PROJECT_ID: 'project-id',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: 'fake-private-key',
      };

      return values[key];
    }),
  };
  const repository = {
    findActiveTokensByUserId: jest.fn(),
    revokeTokens: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('splits tokens into FCM multicast chunks of 500', async () => {
    repository.findActiveTokensByUserId.mockResolvedValue(
      Array.from({ length: 501 }, (_, index) => ({
        token: `token-${index}`,
      })),
    );
    sendEachForMulticastMock
      .mockResolvedValueOnce(
        batchResponse({ successCount: 500, failureCount: 0 }),
      )
      .mockResolvedValueOnce(
        batchResponse({ successCount: 1, failureCount: 0 }),
      );

    const service = new FcmPushService(
      configService as unknown as ConfigService,
      repository as unknown as PushDeviceTokenRepository,
    );

    await service.sendNotificationToUser(10, {
      id: BigInt(1),
      userId: BigInt(10),
      type: NotificationType.CHAT,
      isRead: false,
      createdAt: new Date('2026-06-28T12:00:00.000Z'),
      deletedAt: null,
      title: '제목',
      body: '본문',
      sentById: null,
    });

    const multicastCalls = sendEachForMulticastMock.mock.calls as [
      MulticastMessage,
    ][];
    const firstMessage = multicastCalls[0][0];
    const secondMessage = multicastCalls[1][0];

    expect(sendEachForMulticastMock).toHaveBeenCalledTimes(2);
    expect(firstMessage.tokens).toHaveLength(500);
    expect(secondMessage.tokens).toHaveLength(1);
  });

  it('revokes invalid FCM tokens without logging token values', async () => {
    repository.findActiveTokensByUserId.mockResolvedValue([
      { token: ' valid-token ' },
      { token: 'invalid-token' },
    ]);
    sendEachForMulticastMock.mockResolvedValue(
      batchResponse({
        successCount: 1,
        failureCount: 1,
        errorCodes: [null, 'messaging/registration-token-not-registered'],
      }),
    );

    const service = new FcmPushService(
      configService as unknown as ConfigService,
      repository as unknown as PushDeviceTokenRepository,
    );

    await service.sendNotificationToUser(10, {
      id: BigInt(1),
      userId: BigInt(10),
      type: NotificationType.CHAT,
      isRead: false,
      createdAt: new Date('2026-06-28T12:00:00.000Z'),
      deletedAt: null,
      title: '제목',
      body: '본문',
      sentById: null,
    });

    expect(sendEachForMulticastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['valid-token', 'invalid-token'],
        data: {
          notificationId: '1',
          type: 'CHAT',
        },
      }),
    );
    expect(repository.revokeTokens).toHaveBeenCalledWith(['invalid-token']);
  });

  it('does not send when Firebase credentials are absent', async () => {
    const disabledConfigService = {
      get: jest.fn(() => undefined),
    };
    const service = new FcmPushService(
      disabledConfigService as unknown as ConfigService,
      repository as unknown as PushDeviceTokenRepository,
    );

    await service.sendNotificationToUser(10, {
      id: BigInt(1),
      userId: BigInt(10),
      type: NotificationType.CHAT,
      isRead: false,
      createdAt: new Date('2026-06-28T12:00:00.000Z'),
      deletedAt: null,
      title: '제목',
      body: '본문',
      sentById: null,
    });

    expect(repository.findActiveTokensByUserId).not.toHaveBeenCalled();
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
  });
});
