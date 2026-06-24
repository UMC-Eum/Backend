import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ParsePositiveIntPipe } from '../../../common/pipes/parse-positive-int.pipe';
import { CommentService } from '../services/comment.service';
import {
  CreateCommentRequestDto,
  CreateCommentResponseDto,
  DeleteCommentResponseDto,
  ListCommentsQueryDto,
  ListCommentsResponseDto,
} from '../dtos/comment.dto';

// TODO(auth): 인증 복구 PR 머지 후 아래 import/데코레이터를 되살리고 하드코딩 userId를 제거하세요.
// import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
// import { RequiredUserId } from '../../auth/decorators';

type ApiSuccessExample<T> = {
  resultType: 'SUCCESS';
  success: { data: T };
  error: null;
  meta: { timestamp: string; path: string };
};

function successExample<T>(path: string, data: T): ApiSuccessExample<T> {
  return {
    resultType: 'SUCCESS',
    success: { data },
    error: null,
    meta: {
      timestamp: '2026-05-01T15:20:00.000Z',
      path,
    },
  };
}

@ApiTags('Comments')
@ApiBearerAuth('access-token')
// TODO(auth): 인증 복구 PR 머지 후 주석 해제하세요.
// @UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/articles/:articleId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({
    summary: '댓글 목록 조회',
    description:
      '댓글은 날짜 내림차순으로만 정렬합니다. TODO(auth): 현재 인증 복구 전이라 userId=1로 임시 하드코딩되어 있습니다.',
  })
  @ApiParam({ name: 'clubId', example: 1 })
  @ApiParam({ name: 'articleId', example: 1 })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '이전 응답의 nextCursor. 첫 조회 시 생략',
    example: 'eyJpZCI6NTU0fQ==',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '가져올 댓글 개수. 기본 20, 최대 100',
    example: 20,
  })
  @ApiOkResponse({
    description: '댓글 목록 조회 성공',
    schema: {
      example: successExample('/api/v1/clubs/1/articles/1/comments', {
        articleId: 1024,
        totalCount: 8,
        comments: [
          {
            commentId: 555,
            parentCommentId: null,
            depth: 0,
            contents: '공감 가는 글이네요 :)',
            isMine: false,
            author: {
              userId: 7,
              nickname: '보이스마스터',
              profileImageUrl: 'https://cdn.example.com/profile/7.jpg',
              authority: 'HOST',
            },
            createdAt: '2026-05-01T15:20:00.000Z',
            replies: [
              {
                commentId: 556,
                parentCommentId: 555,
                depth: 1,
                contents: '감사합니다!',
                isMine: true,
                author: {
                  userId: 42,
                  nickname: '달콤한목소리',
                  profileImageUrl: 'https://cdn.example.com/profile/42.jpg',
                  authority: 'GENERAL',
                },
                createdAt: '2026-05-01T15:25:00.000Z',
              },
            ],
          },
        ],
        nextCursor: 'eyJpZCI6NTU0fQ==',
        hasMore: true,
      }),
    },
  })
  @ApiUnauthorizedResponse({
    description: 'TODO(auth): 인증 복구 후 로그인 필요 응답',
  })
  @ApiForbiddenResponse({
    description: '클럽 멤버가 아니어서 댓글 조회 권한이 없음',
  })
  @ApiNotFoundResponse({
    description: '클럽 또는 게시글을 찾을 수 없음',
  })
  @ApiUnprocessableEntityResponse({
    description: 'cursor 또는 limit 형식 오류',
  })
  async listComments(
    // TODO(auth): 인증 복구 PR 머지 후 아래 데코레이터로 교체하세요.
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Query() query: ListCommentsQueryDto,
  ): Promise<ListCommentsResponseDto> {
    // TODO(auth): 임시 하드코딩. AuthGuard/RequiredUserId 복구 후 제거하세요.
    const userId = 1;

    return this.commentService.listComments(userId, clubId, articleId, query);
  }

  @Post()
  @ApiOperation({
    summary: '댓글 작성',
    description:
      'TODO(auth): 현재 인증 복구 전이라 userId=1로 임시 하드코딩되어 있습니다.',
  })
  @ApiParam({ name: 'clubId', example: 1 })
  @ApiParam({ name: 'articleId', example: 1 })
  @ApiBody({ type: CreateCommentRequestDto })
  @ApiCreatedResponse({
    description: '댓글 작성 성공',
    schema: {
      example: successExample('/api/v1/clubs/1/articles/1/comments', {
        commentId: 555,
        articleId: 1024,
        parentCommentId: null,
        depth: 0,
        contents: '공감 가는 글이네요 :)',
        author: {
          userId: 42,
          nickname: '달콤한목소리',
          profileImageUrl: 'https://cdn.example.com/profile/42.jpg',
        },
        createdAt: '2026-05-01T15:20:00.000Z',
      }),
    },
  })
  @ApiUnauthorizedResponse({
    description: 'TODO(auth): 인증 복구 후 로그인 필요 응답',
  })
  @ApiForbiddenResponse({
    description: '클럽 멤버가 아니어서 댓글 작성 권한이 없음',
  })
  @ApiNotFoundResponse({
    description: '클럽, 게시글, 또는 부모 댓글을 찾을 수 없음',
  })
  @ApiUnprocessableEntityResponse({ description: '입력값 형식 오류' })
  @ApiBadRequestResponse({ description: '대댓글까지만 작성 가능' })
  async createComment(
    // TODO(auth): 인증 복구 PR 머지 후 아래 데코레이터로 교체하세요.
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Body() dto: CreateCommentRequestDto,
  ): Promise<CreateCommentResponseDto> {
    // TODO(auth): 임시 하드코딩. AuthGuard/RequiredUserId 복구 후 제거하세요.
    const userId = 1;

    return this.commentService.createComment(userId, clubId, articleId, dto);
  }

  @Delete(':commentId')
  @ApiOperation({
    summary: '댓글 삭제',
    description:
      '댓글 작성자만 삭제할 수 있습니다. TODO(auth): 현재 인증 복구 전이라 userId=1로 임시 하드코딩되어 있습니다.',
  })
  @ApiParam({ name: 'clubId', example: 1 })
  @ApiParam({ name: 'articleId', example: 1024 })
  @ApiParam({ name: 'commentId', example: 555 })
  @ApiOkResponse({
    description: '댓글 삭제 성공',
    schema: {
      example: successExample(
        '/api/v1/clubs/1/articles/1024/comments/555',
        {
          commentId: 555,
          deletedAt: '2026-05-01T15:25:00.000Z',
        },
      ),
    },
  })
  @ApiUnauthorizedResponse({
    description: 'TODO(auth): 인증 복구 후 로그인 필요 응답',
  })
  @ApiForbiddenResponse({
    description: '클럽 멤버가 아니거나 댓글 작성자가 아니어서 삭제 권한이 없음',
  })
  @ApiNotFoundResponse({
    description: '클럽, 게시글, 또는 댓글을 찾을 수 없음',
  })
  @ApiUnprocessableEntityResponse({ description: '파라미터 형식 오류' })
  async deleteComment(
    // TODO(auth): 인증 복구 PR 머지 후 아래 데코레이터로 교체하세요.
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Param('commentId', new ParsePositiveIntPipe()) commentId: number,
  ): Promise<DeleteCommentResponseDto> {
    // TODO(auth): 임시 하드코딩. AuthGuard/RequiredUserId 복구 후 제거하세요.
    const userId = 1;

    return this.commentService.deleteComment(
      userId,
      clubId,
      articleId,
      commentId,
    );
  }
}
