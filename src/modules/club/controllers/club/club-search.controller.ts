import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppException } from '../../../../common/errors/app.exception';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import {
  ClearRecentClubSearchesResponseDto,
  DeleteRecentClubSearchQueryDto,
  DeleteRecentClubSearchResponseDto,
  RecentClubSearchesResponseDto,
} from '../../dtos/club.dto';
import { RecentClubSearchService } from '../../services/club/recent-club-search.service';

@ApiTags('Club')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('clubs/search')
export class ClubSearchController {
  constructor(
    private readonly recentClubSearchService: RecentClubSearchService,
  ) {}

  @Get('recent')
  @ApiOperation({
    summary: '최근 동호회 검색어 목록 조회',
    description:
      '로그인한 사용자의 최근 동호회 검색어를 최신순으로 조회합니다.',
  })
  @ApiOkResponse({
    description: '조회 성공',
    type: RecentClubSearchesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async getRecentSearches(
    @RequiredUserId() userId: number,
  ): Promise<RecentClubSearchesResponseDto> {
    const keywords =
      await this.recentClubSearchService.getRecentSearches(userId);

    return { keywords };
  }

  @Delete('recent/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '최근 동호회 검색어 단건 삭제',
    description: '로그인한 사용자의 최근 동호회 검색어 중 하나를 삭제합니다.',
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: '삭제할 최근 검색어',
    example: '축구',
  })
  @ApiOkResponse({
    description: '삭제 성공',
    type: DeleteRecentClubSearchResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async deleteRecentSearch(
    @RequiredUserId() userId: number,
    @Query() query: DeleteRecentClubSearchQueryDto,
  ): Promise<DeleteRecentClubSearchResponseDto> {
    const keyword = query.keyword?.trim();
    if (!keyword) {
      throw new AppException('CLUB_RECENT_SEARCH_KEYWORD_REQUIRED');
    }

    await this.recentClubSearchService.deleteRecentSearch(userId, keyword);

    return { deletedKeyword: keyword };
  }

  @Delete('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '최근 동호회 검색어 전체 삭제',
    description: '로그인한 사용자의 최근 동호회 검색어를 모두 삭제합니다.',
  })
  @ApiOkResponse({
    description: '삭제 성공',
    type: ClearRecentClubSearchesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async clearRecentSearches(
    @RequiredUserId() userId: number,
  ): Promise<ClearRecentClubSearchesResponseDto> {
    await this.recentClubSearchService.clearRecentSearches(userId);

    return { deleted: true };
  }
}
