import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClubCategory } from '@prisma/client';
import {
  ClubDetailResponseDto,
  LikeClubResponseDto,
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
  ListMyClubsQueryDto,
  ListMyClubsResponseDto,
  ListTopHostsQueryDto,
  ListTopHostsResponseDto,
} from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUserId } from '../../../auth/decorators';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

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
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async listClubs(
    @RequiredUserId() userId: number,
    @Query() query: ListClubsQueryDto,
  ): Promise<ListClubsResponseDto> {
    return this.clubService.listClubs(userId, query);
  }

  @Get('top-hosts')
  @ApiOperation({
    summary: 'top host 조회',
    description: '호스트 랭킹을 조회합니다.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '가져올 호스트 수',
    example: 10,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            hosts: [
              {
                hostId: '42',
                name: '김등산',
                profileImageUrl: 'https://cdn.example.com/users/42.jpg',
                clubCount: 5,
                totalLikes: 123,
              },
            ],
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-21T00:00:00.000Z',
          path: '/api/v1/clubs/top-hosts?limit=10',
        },
      },
    },
  })
  listTopHosts(
    @Query() query: ListTopHostsQueryDto,
  ): Promise<ListTopHostsResponseDto> {
    return this.clubService.listTopHosts(query.limit);
  }

  @Post(':clubId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 좋아요',
    description: '로그인한 사용자가 클럽에 좋아요를 누릅니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '좋아요할 클럽 ID',
    example: 12,
  })
  @ApiOkResponse({
    description: '좋아요 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: '12',
            isLiked: true,
            likeCount: 143,
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T18:05:00.000Z',
          path: '/api/v1/clubs/12/like',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 좋아요한 클럽' })
  likeClub(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<LikeClubResponseDto> {
    return this.clubService.likeClub(userId, clubId);
  }

  @Delete(':clubId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 좋아요 취소',
    description: '로그인한 사용자가 클럽 좋아요를 취소합니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '좋아요를 취소할 클럽 ID',
    example: 12,
  })
  @ApiOkResponse({
    description: '좋아요 취소 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: '12',
            isLiked: false,
            likeCount: 142,
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T18:06:00.000Z',
          path: '/api/v1/clubs/12/like',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '클럽 또는 좋아요를 찾을 수 없음' })
  unlikeClub(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<LikeClubResponseDto> {
    return this.clubService.unlikeClub(userId, clubId);
  }

  @Get(':clubId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 상세 조회',
    description: '클럽 상세 정보와 내 가입/좋아요 상태를 조회합니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '조회할 클럽 ID',
    example: 12,
  })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: '12',
            name: '등산 러버즈',
            category: 'OUTDOOR',
            introVoice: 'https://cdn.example.com/voice/12.mp3',
            introText: '등산으로 친해져요',
            capacity: 30,
            memberCount: 18,
            likes: 142,
            isLiked: false,
            isJoined: true,
            myAuthority: 'GENERAL',
            host: {
              userId: '7',
              nickname: '보이스마스터',
              profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
            },
            keywords: ['야외', '등산', '친목'],
            meetings: [
              {
                meetingId: '88',
                name: '주간 정모',
                day: 'FRI',
                time: '20:00:00',
              },
            ],
            createdAt: '2026-03-01T00:00:00.000Z',
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T15:55:00.000Z',
          path: '/api/v1/clubs/12',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  getClubDetail(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<ClubDetailResponseDto> {
    return this.clubService.getClubDetail(userId, clubId);
  }
}

@ApiTags('Club')
@Controller('users/me/clubs')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('access-token')
export class UserClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  @ApiOperation({
    summary: '내 클럽 목록 조회',
    description: '로그인한 사용자가 가입한 클럽 목록을 조회합니다.',
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
            clubs: [
              {
                clubId: 12,
                name: '보이스 러버즈',
                category: 'CULTURE',
                introText: '목소리로 친해져요',
                thumbnailUrl: 'https://cdn.example.com/clubs/12.jpg',
                capacity: 30,
                memberCount: 18,
                likes: 142,
                myAuthority: 'HOST',
                joinedAt: '2026-04-10T09:00:00.000Z',
              },
            ],
            nextCursor: null,
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T15:50:00.000Z',
          path: '/api/v1/users/me/clubs',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  listMyClubs(
    @RequiredUserId() userId: number,
    @Query() query: ListMyClubsQueryDto,
  ): Promise<ListMyClubsResponseDto> {
    return this.clubService.listMyClubs(userId, query);
  }
}
