import { Controller, Get } from '@nestjs/common';
import { MatchesService } from '../services/matches.service';
import { AppException } from '../../../common/errors/app.exception';
import { RecommendedMatchesResponseDto } from '../dtos/matches.dto';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';

@ApiBearerAuth('access-token')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('recommended')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '추천 매칭 조회',
    description: 'FastAPI 추천 엔진 결과를 조회합니다.',
  })
  @ApiOkResponse({ type: RecommendedMatchesResponseDto })
  async getRecommendedMatches(@RequiredUserId() userId: number) {
    try {
      const result = await this.matchesService.getRecommendedMatches(
        BigInt(userId),
      );
      return result;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: error,
      });
    }
  }
}
