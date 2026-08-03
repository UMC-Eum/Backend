import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReportService } from '../../services/report/report.service';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import {
  CreateReportRequestDto,
  CreateUnifiedReportRequestDto,
  CreateUserReportRequestDto,
  ReportCreatedResponseDto,
} from '../../dtos/report.dto';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';

@ApiTags('Report')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class ReportController {
  public constructor(private readonly reportService: ReportService) {}

  @Post('reports')
  @ApiOperation({ summary: '콘텐츠 통합 신고 생성' })
  @ApiBody({ type: CreateUnifiedReportRequestDto })
  @ApiCreatedResponse({
    description: '신고 접수 완료',
    type: ReportCreatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '신고 대상을 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 신고한 대상' })
  async createUnifiedReport(
    @RequiredUserId() userId: number,
    @Body() dto: CreateUnifiedReportRequestDto,
  ): Promise<ReportCreatedResponseDto> {
    return this.reportService.createUnifiedReport(String(userId), dto);
  }

  @Post('report')
  @ApiOperation({ summary: '사용자 신고 생성' })
  @ApiBody({ type: CreateUserReportRequestDto })
  @ApiCreatedResponse({ description: '신고 접수 완료' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async createReport(
    @RequiredUserId() userId: number,
    @Body() dto: CreateUserReportRequestDto,
  ) {
    return this.reportService.createReport(
      String(userId),
      dto.targetUserId,
      dto.reason,
      dto.category,
      dto.chatRoomId,
    );
  }

  @Post('report/clubs/:clubId')
  @ApiOperation({ summary: '동호회 신고 생성' })
  @ApiParam({ name: 'clubId', example: 12 })
  @ApiBody({ type: CreateReportRequestDto })
  @ApiCreatedResponse({
    description: '동호회 신고 접수 완료',
    type: ReportCreatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '동호회를 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 신고한 동호회' })
  async createClubReport(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Body() dto: CreateReportRequestDto,
  ): Promise<ReportCreatedResponseDto> {
    return this.reportService.createClubReport(
      String(userId),
      String(clubId),
      dto,
    );
  }

  @Post('report/clubs/:clubId/articles/:articleId')
  @ApiOperation({ summary: '동호회 게시글 신고 생성' })
  @ApiParam({ name: 'clubId', example: 12 })
  @ApiParam({ name: 'articleId', example: 345 })
  @ApiBody({ type: CreateReportRequestDto })
  @ApiCreatedResponse({
    description: '동호회 게시글 신고 접수 완료',
    type: ReportCreatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '게시글을 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 신고한 게시글' })
  async createArticleReport(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Body() dto: CreateReportRequestDto,
  ): Promise<ReportCreatedResponseDto> {
    return this.reportService.createArticleReport(
      String(userId),
      String(clubId),
      String(articleId),
      dto,
    );
  }

  @Post('report/clubs/:clubId/articles/:articleId/comments/:commentId')
  @ApiOperation({ summary: '동호회 게시글 댓글 신고 생성' })
  @ApiParam({ name: 'clubId', example: 12 })
  @ApiParam({ name: 'articleId', example: 345 })
  @ApiParam({ name: 'commentId', example: 678 })
  @ApiBody({ type: CreateReportRequestDto })
  @ApiCreatedResponse({
    description: '댓글 신고 접수 완료',
    type: ReportCreatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiNotFoundResponse({ description: '게시글 또는 댓글을 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 신고한 댓글' })
  async createCommentReport(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('articleId', new ParsePositiveIntPipe()) articleId: number,
    @Param('commentId', new ParsePositiveIntPipe()) commentId: number,
    @Body() dto: CreateReportRequestDto,
  ): Promise<ReportCreatedResponseDto> {
    return this.reportService.createCommentReport(
      String(userId),
      String(clubId),
      String(articleId),
      String(commentId),
      dto,
    );
  }
}
