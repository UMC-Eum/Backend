import { Controller, Get, Query } from '@nestjs/common';
import { MatchesService } from '../services/matches.service';
import { AppException } from '../../../common/errors/app.exception';
import { GetRecommendedMatchesQueryDto } from '../dtos/matches.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('recommended')
  async getRecommendedMatches(
    @Query() query: GetRecommendedMatchesQueryDto,
  ) {
    try {
      const userId = BigInt(1); // TODO: 실제 userId 받기

      const result = await this.matchesService.getRecommendedMatches(
        userId,
        query.size ?? 20,
        query.ageMin,
        query.ageMax,
      );

      return result;
    } catch (err) {
      if (err instanceof AppException) {
        throw err;
      }

      throw new AppException('MATCH_NOT_FOUND', {
        details: err,
      });
    }
  }
}