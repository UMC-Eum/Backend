import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ClubCategory } from '@prisma/client';
import {
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
} from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';

@ApiTags('Club')
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  @ApiOperation({
    summary: '클럽 목록 조회',
    description:
      '키워드, 카테고리, 정렬 기준으로 클럽 목록을 커서 기반 페이지네이션으로 조회합니다.',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '이름/소개/키워드 검색어',
    example: '등산',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '카테고리 필터',
    enum: ClubCategory,
    example: ClubCategory.OUTDOOR,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 기준',
    enum: ClubListSort,
    example: ClubListSort.POPULAR,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '가져올 클럽 수',
    example: 20,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            nextCursor: null,
            items: [
              {
                clubId: '1',
                name: '새벽 등산 모임',
                introText: '함께 새벽 산행할 분들 모집해요.',
                category: 'OUTDOOR',
                thumbnailUrl: 'https://cdn.example.com/clubs/1.jpg',
                likes: 32,
                memberCount: 12,
              },
            ],
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-21T00:00:00.000Z',
          path: '/api/v1/clubs?sort=POPULAR&limit=20',
        },
      },
    },
  })
  listClubs(@Query() query: ListClubsQueryDto): Promise<ListClubsResponseDto> {
    return this.clubService.listClubs(query);
  }
}
