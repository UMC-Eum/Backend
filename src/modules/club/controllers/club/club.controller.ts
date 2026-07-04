import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
  CreateClubRequestDto,
  CreateClubResponseDto,
  DeleteClubResponseDto,
  LikeClubResponseDto,
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
  ListTopHostsQueryDto,
  ListTopHostsResponseDto,
  UpdateClubRequestDto,
  UpdateClubResponseDto,
} from '../../dtos/club.dto';
import { ClubService } from '../../services/club/club.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUserId } from '../../../auth/decorators';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

@ApiTags('Club')
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 생성',
    description: '로그인한 사용자가 새 클럽을 생성하고 호스트가 됩니다.',
  })
  @ApiBody({ type: CreateClubRequestDto })
  @ApiCreatedResponse({
    description: '클럽 생성 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: 12,
            code: '1168000000',
            name: '보이스 러버즈',
            category: 'OTHERS',
            areaCode: '1168000000',
            capacity: 30,
            approvalRequired: false,
            boardPublic: true,
            memberCount: 1,
            host: {
              userId: 7,
              nickname: '보이스마스터',
              profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
            },
            createdAt: '2026-05-01T16:35:00.000Z',
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T16:35:00.000Z',
          path: '/api/v1/clubs',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  createClub(
    @RequiredUserId() userId: number,
    @Body() dto: CreateClubRequestDto,
  ): Promise<CreateClubResponseDto> {
    return this.clubService.createClub(userId, dto);
  }

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
    example: ClubCategory.HOBBY,
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
                category: 'HOBBY',
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

  @Patch(':clubId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 정보 부분 수정',
    description:
      '호스트가 클럽 정보를 부분 수정합니다. 요청 body에 포함된 필드만 변경합니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '수정할 클럽 ID',
    example: 12,
  })
  @ApiBody({
    type: UpdateClubRequestDto,
    examples: {
      partial: {
        summary: '일부 필드만 수정',
        value: {
          name: '등산 러버즈 시즌3',
          capacity: 60,
        },
      },
      removeIntroVoice: {
        summary: '음성 소개 제거',
        value: {
          introVoice: null,
        },
      },
    },
  })
  @ApiOkResponse({
    description: '수정 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: '12',
            name: '등산 러버즈 시즌3',
            category: 'HOBBY',
            introText: '더 즐겁게 모여요',
            introVoice: null,
            capacity: 60,
            updatedAt: '2026-05-01T20:25:00.000Z',
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T20:25:00.000Z',
          path: '/api/v1/clubs/12',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiForbiddenResponse({ description: '호스트가 아님' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  updateClub(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Body() dto: UpdateClubRequestDto,
  ): Promise<UpdateClubResponseDto> {
    return this.clubService.updateClub(userId, clubId, dto);
  }

  @Delete(':clubId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '클럽 삭제',
    description: '호스트가 클럽을 soft delete 처리합니다.',
  })
  @ApiParam({
    name: 'clubId',
    description: '삭제할 클럽 ID',
    example: 12,
  })
  @ApiOkResponse({
    description: '삭제 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: '12',
            deletedAt: '2026-05-01T18:50:00.000Z',
          },
        },
        error: null,
        meta: {
          timestamp: '2026-05-01T18:50:00.000Z',
          path: '/api/v1/clubs/12',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiForbiddenResponse({ description: '호스트가 아님' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  deleteClub(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<DeleteClubResponseDto> {
    return this.clubService.deleteClub(userId, clubId);
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
            category: 'HOBBY',
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
