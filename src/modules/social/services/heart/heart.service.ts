import { Injectable, Logger } from '@nestjs/common';
import { HeartRepository } from '../../repositories/heart.repository';
import {
  HeartReceivedItem,
  HeartSentItem,
  HeartListPayload,
  HeartItemBase,
} from '../../dtos/heart.dto';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';
import { NotificationService } from '../../../notification/services/notification.service';
import { UserService } from '../../../user/services/user/user.service';

interface PaginationParams {
  userId: string;
  cursor?: string;
  size?: string;
  path: string;
}

@Injectable()
export class HeartService {
  private readonly logger = new Logger(HeartService.name);

  constructor(
    private readonly heartRepository: HeartRepository,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  async createHeart(
    userId: string,
    targetUserId: string,
  ): Promise<HeartItemBase> {
    const result = await this.heartRepository.postHeart(userId, targetUserId);
    const targetUserName = await this.userService
      .getMe(Number(targetUserId))
      .then((user) => user.nickname);
    try {
      await this.notificationService.createNotification(
        Number(targetUserId),
        'HEART',
        '마음을 누른 사람이 생겼습니다!',
        `${targetUserName}님이 회원님에게 마음을 보냈습니다.`,
      );
    } catch {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: ERROR_DEFINITIONS.SERVER_TEMPORARY_ERROR.message,
        details: { field: 'targetUserId' },
      });
    }
    if (result.ok) {
      return result.heart;
    } else {
      if (result.reason === 'TARGET_NOT_FOUND') {
        throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
          message: ERROR_DEFINITIONS.SOCIAL_TARGET_USER_NOT_FOUND.message,
          details: { field: 'targetUserId' },
        });
      } else if (result.reason === 'ALREADY_EXISTS') {
        throw new AppException('SOCIAL_HEART_ALREADY_EXISTS', {
          message: ERROR_DEFINITIONS.SOCIAL_HEART_ALREADY_EXISTS.message,
          details: { field: 'targetUserId' },
        });
      } else {
        throw new AppException('SERVER_TEMPORARY_ERROR', {
          message: ERROR_DEFINITIONS.SERVER_TEMPORARY_ERROR.message,
          details: { field: 'targetUserId' },
        });
      }
    }
  }

  async patchHeart(heartId: number): Promise<HeartItemBase> {
    const result = await this.heartRepository.patchHeart(heartId);
    if (result == null) {
      throw new AppException('SOCIAL_HEART_NOT_FOUND', {
        message: ERROR_DEFINITIONS.SOCIAL_HEART_NOT_FOUND.message,
        details: { field: 'heartId' },
      });
    } else return result;
  }

  async getReceivedHearts(
    params: PaginationParams,
  ): Promise<HeartListPayload<HeartReceivedItem>> {
    this.logger.debug(
      `getReceivedHearts called userId=${params.userId} cursor=${params.cursor} size=${params.size}`,
    );
    const result = await this.heartRepository.getReceivedHeartsByUserId({
      userId: params.userId,
      cursor: params.cursor,
      size: this.parseSize(params.size),
    });
    if (result == null)
      throw new AppException('SOCIAL_NO_HEART', {
        message: ERROR_DEFINITIONS.SOCIAL_NO_HEART.message,
        details: { field: 'cursor' },
      });
    return result as HeartListPayload<HeartReceivedItem>;
  }

  async getSentHearts(
    params: PaginationParams,
  ): Promise<HeartListPayload<HeartSentItem>> {
    this.logger.debug(
      `getSentHearts called userId=${params.userId} cursor=${params.cursor} size=${params.size}`,
    );
    const result = await this.heartRepository.getSentHeartsByUserId({
      userId: params.userId,
      cursor: params.cursor,
      size: this.parseSize(params.size),
    });
    if (result == null)
      throw new AppException('SOCIAL_NO_HEART', {
        message: ERROR_DEFINITIONS.SOCIAL_NO_HEART.message,
        details: { field: 'cursor' },
      });
    return result as HeartListPayload<HeartSentItem>;
  }

  private parseSize(size?: string) {
    this.logger.debug(`parseSize input=${size}`);
    if (!size) return 20;
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(parsed, 50);
  }
}
