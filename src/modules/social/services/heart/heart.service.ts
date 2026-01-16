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

interface PaginationParams {
  userId: string;
  cursor?: string;
  size?: string;
  path: string;
}

@Injectable()
export class HeartService {
  private readonly logger = new Logger(HeartService.name);

  constructor(private readonly heartRepository: HeartRepository) {}

  async createHeart(
    userId: string,
    targetUserId: string,
  ): Promise<HeartItemBase> {
    const result = await this.heartRepository.postHeart(userId, targetUserId);
    if (result == null) {
      throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
        message: ERROR_DEFINITIONS.SOCIAL_TARGET_USER_NOT_FOUND.message,
        details: { targetUserId: targetUserId },
      });
    } else return result;
  }

  async patchHeart(heartId: number): Promise<HeartItemBase> {
    const result = await this.heartRepository.patchHeart(heartId);
    if (result == null) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: ERROR_DEFINITIONS.VALIDATION_INVALID_FORMAT.message,
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
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: ERROR_DEFINITIONS.VALIDATION_INVALID_FORMAT.message,
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
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: ERROR_DEFINITIONS.VALIDATION_INVALID_FORMAT.message,
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
