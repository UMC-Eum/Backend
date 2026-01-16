import { Injectable } from '@nestjs/common';
import { BlockRepository } from '../../repositories/block.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';

interface PaginationParams {
  userId: string;
  cursor?: string;
  size?: string;
  path: string;
}

@Injectable()
export class BlockService {
  constructor(private readonly blockRepository: BlockRepository) {}

  async createBlock(userId: string, targetUserId: string, reason: string) {
    const result = await this.blockRepository.createBlock(
      userId,
      targetUserId,
      reason,
    );
    //targetUserId에 해당하는 유저가 없을때
    if (result === null) {
      throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND', {
        message: ERROR_DEFINITIONS.SOCIAL_TARGET_USER_NOT_FOUND.message,
        details: { targetUserId: targetUserId },
      });
    } else return result;
  }
  async unActivateBlock(blockId: string) {
    const result = await this.blockRepository.patchBlock(blockId);
    //해당되는 block이 없을때
    if (result == null)
      throw new AppException('SOCIAL_BLOCK_NOT_FOUND', {
        message: ERROR_DEFINITIONS.SOCIAL_BLOCK_NOT_FOUND.message,
        details: { field: 'blockId' },
      });
    return result;
  }
  async getBlock(params: PaginationParams) {
    const result = await this.blockRepository.getBlock({
      userId: params.userId,
      cursor: params.cursor,
      size: params.size,
    });
    if (result == null) {
      // getBlock에서 해당 입력값에 대응되는 block이 없을때 오류 던지기. 이에 대한 오류 메세지를 정의해줘야함?
      throw new AppException('SOCIAL_NO_BLOCKED', {
        message: ERROR_DEFINITIONS.SOCIAL_NO_BLOCKED.message,
        details: { field: 'cursor' },
      });
    }
    return result;
  }
}
