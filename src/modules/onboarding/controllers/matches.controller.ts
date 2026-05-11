import { Controller, Get, Query } from '@nestjs/common';
import { MatchesService } from '../services/matches.service';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
    description:
      'FastAPI 추천 엔진 결과를 그대로 조회합니다. 첫 페이지는 cursor 없이 요청하고, 다음 페이지부터는 응답의 nextCursor를 cursor로 전달합니다.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      '페이지네이션 커서(선택). 첫 조회 시 생략하고, 이후에는 이전 응답의 nextCursor 값을 전달합니다.',
    example: 'MTAy',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description:
      '페이지 크기(선택). FastAPI가 지원하는 값 기준으로 전달됩니다.',
    example: 20,
  })
  @ApiOkResponse({
    description: '추천 매칭 조회 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            items: [
              {
                userId: 106,
                nickname: 'var01',
                age: 25,
                profileImageUrl: 'https://cdn.example.com/profile/var1.jpg',
                introText: '3072 varied candidate #1',
                similarityScore: 1,
              },
            ],
            page: {
              size: 3,
              hasNext: true,
              nextCursor: 'eyJzaW1pbGFyaXR5U2NvcmUiOjEuMCwidXNlcklkIjoxMDh9',
            },
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-11T15:46:05.123Z',
          path: '/api/v1/matches/recommended',
        },
      },
    },
  })
  async getRecommendedMatches(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    try {
      const result = await this.matchesService.getRecommendedMatches(
        BigInt(userId),
        cursor,
        size,
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
