import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MatchesService } from '../services/matches.service';
import { AppException } from '../../../common/errors/app.exception';
import { GetRecommendedMatchesQueryDto } from '../dtos/matches.dto';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiQuery } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';

@ApiBearerAuth('access-token')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('recommended')
  @UseGuards(AccessTokenGuard)
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: '다음 페이지 커서',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: '조회할 매치 개수',
    example: 20,
  })
  @ApiQuery({
    name: 'ageMin',
    required: false,
    type: Number,
    description: '최소 나이',
    example: 20,
  })
  @ApiQuery({
    name: 'ageMax',
    required: false,
    type: Number,
    description: '최대 나이',
    example: 50,
  })
  async getRecommendedMatches(
    @RequiredUserId() userId: number,
    @Query() query: GetRecommendedMatchesQueryDto,
  ) {
    try {
      let startFromUserId: bigint | null = null;
      if (query.cursor) {
        try {
          const decodedCursor = Buffer.from(query.cursor, 'base64').toString(
            'utf-8',
          );
          startFromUserId = BigInt(decodedCursor);
        } catch (err) {
          throw new AppException('VALIDATION_INVALID_FORMAT', {
            details: 'Invalid cursor format',
          });
        }
      }

      const result = await this.matchesService.getRecommendedMatches(
        BigInt(userId),
        query.size ?? 20,
        query.ageMin,
        query.ageMax,
        startFromUserId,
      );
      return result;
    } catch (err) {
      if (err instanceof AppException) {
        throw err;
      }
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: err,
      });
    }
  }
}
