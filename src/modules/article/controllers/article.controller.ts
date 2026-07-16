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
import { ModerateContent } from '../../../common/moderation/moderate-content.decorator';

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
  @UseGuards(AccessTokenGuard)
  findArticles(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articleService.findClubArticles(userId, clubId, query);
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
  @UseGuards(AccessTokenGuard)
  findArchive(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articleService.findArchivePhotos(userId, clubId, query);
  }

  @ApiOperation({ summary: '동호회 게시글 상세 조회' })
  @ApiParam({ name: 'clubId', description: '클럽 ID', example: 1 })
  @ApiParam({ name: 'articleId', description: '게시글 ID', example: 1 })
  @ApiOkResponse({ type: ArticleDetailDto })
  @Get(':articleId')
  @UseGuards(AccessTokenGuard)
  findArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  @ModerateContent({
    surface: 'ARTICLE',
    textFields: ['title', 'contents'],
    imageFields: ['photoUrls'],
  })
  createArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  @ModerateContent({
    surface: 'ARTICLE',
    textFields: ['title', 'contents'],
    imageFields: ['photoUrls'],
  })
  updateArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  pinArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  deleteArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  likeArticle(
    @RequiredUserId() userId: number,
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
  @UseGuards(AccessTokenGuard)
  unlikeArticle(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
  ) {
    return this.articleService.unlikeArticle(userId, clubId, articleId);
  }
}
