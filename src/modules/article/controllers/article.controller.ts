import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ParsePositiveIntPipe } from '../../../common/pipes/parse-positive-int.pipe';
import { RequiredUserId } from '../../../modules/auth/decorators';
import { AccessTokenGuard } from '../../../modules/auth/guards/access-token.guard';
import { ArticleService } from '../services/article.service';
import {
  ArticleDetailDto,
  ArticleDto,
  DeleteArticleResponseDto,
  LikeArticleResponseDto,
  UpdateArticleResponseDto,
  PinArticleDto,
  PinArticleResponseDto,
  ListArticlesResponseDto,
  GetArchiveResponseDto,
} from '../dtos/article.dto';
import { CreateArticleDto } from '../dtos/create-article.dto';
import { ListArticlesQueryDto } from '../dtos/list-articles-query.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';

@ApiBearerAuth('access-token')
@Controller('clubs/:clubId/articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({ summary: '동호회 게시글 목록 조회' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '게시글 카테고리. 생략 시 전체 조회',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 기준: recent | popular',
    example: 'recent',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '한 페이지당 가져올 개수 (기본 20, 최대 50)',
    example: 20,
  })
  @ApiOkResponse({ type: ListArticlesResponseDto })
  @Get()
  // TODO: 인증 추가
  // Auth 수정이 필요함. 일단 하드코딩하고, dev에 머지 전까지 반드시 수정.
  // @UseGuards(AccessTokenGuard)
  findArticles(
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articleService.findClubArticles(clubId, query);
  }

  @ApiOperation({ summary: '동호회 사진 모음 조회' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 기준: recent | popular',
    example: 'recent',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '한 페이지당 가져올 개수 (기본 20, 최대 50)',
    example: 20,
  })
  @ApiOkResponse({ type: GetArchiveResponseDto })
  @Get('archive')
  // TODO: 인증 추가
  // @UseGuards(AccessTokenGuard)
  findArchive(
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articleService.findArchivePhotos(clubId, query);
  }

  @ApiOperation({ summary: '동호회 게시글 상세 조회' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiOkResponse({ type: ArticleDetailDto })
  @Get(':articleId')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  findArticle(
    // @RequiredUserId() userId: number,
    userId = 2,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
  ) {
    return this.articleService.findArticleDetail(userId, clubId, articleId);
  }

  @ApiOperation({ summary: '동호회 게시글 생성' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiBody({ type: CreateArticleDto })
  @ApiOkResponse({ type: ArticleDto })
  @Post()
  // TODO: 인증 추가
  // Auth 수정이 필요함. 일단 하드코딩하고, dev에 머지 전까지 반드시 수정.
  // @UseGuards(AccessTokenGuard)
  createArticle(
    // @RequiredUserId() userId: number,
    userId = 1,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Body() createArticleDto: CreateArticleDto,
  ) {
    return this.articleService.createArticle(userId, clubId, createArticleDto);
  }

  @ApiOperation({ summary: '동호회 게시글 수정' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiBody({ type: UpdateArticleDto })
  @ApiOkResponse({ type: UpdateArticleResponseDto })
  @Patch(':articleId')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  updateArticle(
    userId = 1,
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articleService.updateArticle(
      userId,
      clubId,
      articleId,
      updateArticleDto,
    );
  }

  @ApiOperation({ summary: '동호회 게시글 핀 고정/해제' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiBody({ type: PinArticleDto })
  @ApiOkResponse({ type: PinArticleResponseDto })
  @Patch(':articleId/pin')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  pinArticle(
    userId = 1,
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Body() pinArticleDto: PinArticleDto,
  ) {
    return this.articleService.pinArticle(
      userId,
      clubId,
      articleId,
      pinArticleDto,
    );
  }

  @ApiOperation({ summary: '동호회 게시글 삭제' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiOkResponse({ type: DeleteArticleResponseDto })
  @Delete(':articleId')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  deleteArticle(
    userId = 1,
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
  ) {
    return this.articleService.deleteArticle(userId, clubId, articleId);
  }

  @ApiOperation({ summary: '동호회 게시글 좋아요' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiOkResponse({ type: LikeArticleResponseDto })
  @Post(':articleId/like')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  likeArticle(
    userId = 1,
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
  ) {
    return this.articleService.likeArticle(userId, clubId, articleId);
  }

  @ApiOperation({ summary: '동호회 게시글 좋아요 취소' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiOkResponse({ type: LikeArticleResponseDto })
  @Delete(':articleId/like')
  // TODO: 인증 추가
  // Auth 수정 필요
  // @UseGuards(AccessTokenGuard)
  unlikeArticle(
    userId = 1,
    // @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
  ) {
    return this.articleService.unlikeArticle(userId, clubId, articleId);
  }
}
