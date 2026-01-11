import { Injectable } from '@nestjs/common';
import { BlockRepository } from '../../repositories/block.repository';

@Injectable()
export class BlockService {
  constructor(private readonly blockRepository: BlockRepository) {}

  async createBlock(userId: string, targetUserId: string, reason: string) {
    return this.blockRepository.createBlock(userId, targetUserId, reason);
  }
}
