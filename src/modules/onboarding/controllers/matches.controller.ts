import { Controller, Get, Query } from '@nestjs/common';
import { MatchesService } from '../services/matches.service';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';
import { RecommendedClubsResponseDto } from '../dtos/matches.dto';

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

  @Get('club/recommended')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '추천 클럽 조회',
    description:
      '로그인한 사용자에게 추천할 클럽 목록을 조회합니다. 첫 페이지는 cursor 없이 요청하고, 다음 페이지부터는 응답의 nextCursor 값을 cursor로 전달합니다.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '추천 클럽 페이지네이션 커서',
    example: 'eyJzaW1pbGFyaXR5U2NvcmUiOjAuNDEyMywiY2x1YklkIjoiOCJ9',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '가져올 추천 클럽 수',
    example: 20,
  })
  @ApiQuery({
    name: 'areaCode',
    required: false,
    description:
      '동/읍/면 주소 코드 필터. 전달하면 해당 지역 기준 추천 클럽을 조회합니다.',
    example: '1168000000',
  })
  @ApiOkResponse({
    description: '추천 클럽 조회 성공',
    type: RecommendedClubsResponseDto,
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            items: [
              {
                clubId: '7',
                name: '즉흥 여행 맛집 탐방',
                category: 'CULTURE_ART',
                addressCode: '1159010800',
                addressName: '서울특별시 동작구 대방동',
                sidoCode: '11',
                sigunguCode: '590',
                introText:
                  '주말에 갑자기 바다를 보러 가거나 새로운 맛집을 찾아다니는 즉흥 여행 동호회입니다. 유머 코드가 맞고 같이 웃을 수 있는 편안한 분위기를 좋아하는 사람들이 모입니다.',
                thumbnailUrl:
                  'https://cdn.example.com/clubs/dummy-remaining-2.jpg',
                capacity: 24,
                likes: 55,
                similarityScore: 0.5109,
              },
              {
                clubId: '5',
                name: '영어 회화와 카페 투어',
                category: 'STUDY',
                addressCode: '1159010600',
                addressName: '서울특별시 동작구 동작동',
                sidoCode: '11',
                sigunguCode: '590',
                introText:
                  '새로운 카페를 찾아다니며 부담 없이 영어로 대화하는 모임입니다. 완벽한 영어보다 꾸준히 말해보는 용기를 중요하게 생각하고, 서로 틀린 표현도 부드럽게 도와주는 분위기입니다.',
                thumbnailUrl: 'https://cdn.example.com/clubs/dummy-4.jpg',
                capacity: 16,
                likes: 28,
                similarityScore: 0.5098,
              },
            ],
            page: {
              size: 20,
              hasNext: false,
              nextCursor: null,
            },
          },
        },
        error: null,
        meta: {
          timestamp: '2026-06-25T06:22:47.240Z',
          path: '/api/v1/matches/club/recommended?areaCode=1168000000',
        },
      },
    },
  })
  async getRecommendedClubs(
    @RequiredUserId() userId: number,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
    @Query('areaCode') areaCode?: string,
  ) {
    try {
      const result = await this.matchesService.getRecommendedClubs(
        BigInt(userId),
        cursor,
        size,
        areaCode,
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
