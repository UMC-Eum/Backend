import { Injectable } from '@nestjs/common';
import { MatchesRepository } from '../repositories/matches.repository';

@Injectable()
export class MatchesService {
  constructor(private readonly matchesRepository: MatchesRepository) {}

  async getRecommendedMatches(
    userId: bigint,
    size = 20,
    ageMin?: number,
    ageMax?: number,
  ) {
    const items = await this.matchesRepository.findRecommendedMatches(
      userId,
      size,
      ageMin,
      ageMax,
    );
    return {
      nextCursor:
        items.length > 0
          ? this.generatorCursor(items[items.length - 1].userId)
          : null,
      items,
    };
  }
  private generatorCursor(userId: bigint | number): string {
    return Buffer.from(userId.toString()).toString('base64');
  }
}
