import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification } from '@prisma/client';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  MulticastMessage,
} from 'firebase-admin/messaging';
import { PushDeviceTokenRepository } from '../repositories/push-device-token.repository';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

@Injectable()
export class FcmPushService {
  private readonly logger = new Logger(FcmPushService.name);
  private readonly messaging: Messaging | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly pushDeviceTokenRepository: PushDeviceTokenRepository,
  ) {
    this.messaging = this.createMessagingClient();
  }

  async sendNotificationToUser(
    userId: number,
    notification: Notification,
  ): Promise<void> {
    if (!this.messaging) {
      return;
    }

    const tokenRecords =
      await this.pushDeviceTokenRepository.findActiveTokensByUserId(userId);
    const tokens = tokenRecords.map((record) => record.token);

    if (tokens.length === 0) {
      return;
    }

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notificationId: notification.id.toString(),
        type: notification.type,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      android: {
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await this.messaging.sendEachForMulticast(message);
    const invalidTokens: string[] = [];

    response.responses.forEach((sendResponse, index) => {
      const errorCode = sendResponse.error?.code;

      if (errorCode && INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length > 0) {
      await this.pushDeviceTokenRepository.revokeTokens(invalidTokens);
    }

    if (response.failureCount > invalidTokens.length) {
      this.logger.warn(
        `FCM send completed with ${response.failureCount} failures notificationId=${notification.id.toString()}`,
      );
    }
  }

  private createMessagingClient(): Messaging | null {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'FCM is disabled because Firebase credentials are empty',
      );
      return null;
    }

    try {
      const app =
        getApps()[0] ??
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

      return getMessaging(app);
    } catch (e) {
      this.logger.error(`FCM is disabled: ${String(e)}`);
      return null;
    }
  }
}
