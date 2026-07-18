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
const FCM_MULTICAST_TOKEN_LIMIT = 500;

export type FcmNotificationData = Record<string, string>;

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
    data: FcmNotificationData = {},
  ): Promise<void> {
    if (!this.messaging) {
      this.logger.warn(
        `FCM send skipped because messaging client is disabled userId=${userId} notificationId=${notification.id.toString()}`,
      );
      return;
    }

    const tokenRecords =
      await this.pushDeviceTokenRepository.findActiveTokensByUserId(userId);
    const tokens = tokenRecords
      .map((record) => record.token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      this.logger.warn(
        `FCM send skipped because active token is empty userId=${userId} notificationId=${notification.id.toString()}`,
      );
      return;
    }

    const invalidTokens: string[] = [];
    let failureCount = 0;

    for (
      let index = 0;
      index < tokens.length;
      index += FCM_MULTICAST_TOKEN_LIMIT
    ) {
      const tokenChunk = tokens.slice(index, index + FCM_MULTICAST_TOKEN_LIMIT);
      const chunkNumber = Math.floor(index / FCM_MULTICAST_TOKEN_LIMIT) + 1;
      const message: MulticastMessage = {
        tokens: tokenChunk,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          notificationId: notification.id.toString(),
          type: String(notification.type),
          ...data,
        },
        apns: {
          headers: {
            'apns-push-type': 'alert',
            'apns-priority': '10',
          },
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
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

      try {
        const response = await this.messaging.sendEachForMulticast(message);
        failureCount += response.failureCount;

        this.logger.log(
          `FCM chunk send result userId=${userId} notificationId=${notification.id.toString()} chunk=${chunkNumber} tokenCount=${tokenChunk.length} successCount=${response.successCount} failureCount=${response.failureCount}`,
        );

        response.responses.forEach((sendResponse, responseIndex) => {
          const errorCode = sendResponse.error?.code;

          if (errorCode && INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
            invalidTokens.push(tokenChunk[responseIndex]);
          }

          if (errorCode) {
            this.logger.warn(
              `FCM token send failed userId=${userId} notificationId=${notification.id.toString()} chunk=${chunkNumber} tokenIndex=${responseIndex} errorCode=${errorCode}`,
            );
          }
        });
      } catch (e) {
        failureCount += tokenChunk.length;
        this.logger.warn(
          `FCM chunk send failed userId=${userId} notificationId=${notification.id.toString()} chunk=${chunkNumber} tokenCount=${tokenChunk.length} errorName=${this.getErrorName(e)} errorCode=${this.getErrorCode(e) ?? 'unknown'}`,
        );
      }
    }

    if (invalidTokens.length > 0) {
      await this.pushDeviceTokenRepository.revokeTokens(invalidTokens);
      this.logger.warn(
        `FCM revoked invalid tokens userId=${userId} notificationId=${notification.id.toString()} count=${invalidTokens.length}`,
      );
    }

    if (failureCount > invalidTokens.length) {
      this.logger.warn(
        `FCM send completed with ${failureCount} failures notificationId=${notification.id.toString()}`,
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
      this.logger.error(
        `FCM is disabled errorName=${this.getErrorName(e)} errorCode=${this.getErrorCode(e) ?? 'unknown'}`,
      );
      return null;
    }
  }

  private getErrorCode(error: unknown): string | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code;
    }

    return null;
  }

  private getErrorName(error: unknown): string {
    if (error instanceof Error && error.name) {
      return error.name;
    }

    return 'unknown';
  }
}
