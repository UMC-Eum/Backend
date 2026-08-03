import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  ReportCategory,
  ReportTargetType,
} from '@prisma/client';
import { ReportRepository } from '../../repositories/report.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';
import {
  CreateReportRequestDto,
  CreateUnifiedReportRequestDto,
} from '../../dtos/report.dto';
import { NotificationService } from '../../../notification/services/notification.service';

@Injectable()
export class ReportService {
  private static readonly CLUB_REPORT_DEACTIVATION_THRESHOLD = 5;
  private static readonly CONTENT_REPORT_BLIND_THRESHOLD = 3;

  constructor(
    readonly reportRepository: ReportRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async createReport(
    userId: string,
    targetUserId: string,
    reason: string,
    category: ReportCategory,
    chatRoomId?: string,
  ) {
    const result = await this.reportRepository.createReport(
      userId,
      targetUserId,
      reason,
      category,
      chatRoomId,
    );
    if (result.reason === 'Already reported.') {
      throw new AppException('SOCIAL_REPORT_EXISTS', {
        message: ERROR_DEFINITIONS.SOCIAL_REPORT_EXISTS.message,
        details: { field: 'targetUserId' },
      });
    } else return result;
  }

  async createUnifiedReport(
    userId: string,
    dto: CreateUnifiedReportRequestDto,
  ) {
    await this.assertUnifiedReportTarget(dto);

    const result = await this.reportRepository.createUnifiedReport({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.detail,
      category: dto.reasonCode,
      targetUserId: dto.targetUserId,
      chatRoomId: dto.chatRoomId,
    });

    if (result.reason === 'Already reported.') {
      throw new AppException('SOCIAL_REPORT_EXISTS', {
        message: ERROR_DEFINITIONS.SOCIAL_REPORT_EXISTS.message,
        details: { field: 'targetId' },
      });
    }

    await this.handleContentReportThreshold(dto.targetType, dto.targetId);
    return result;
  }

  async createClubReport(
    userId: string,
    clubId: string,
    dto: CreateReportRequestDto,
  ) {
    const club = await this.reportRepository.findActiveClubById(clubId);
    if (!club) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const result = await this.reportRepository.createClubReport(
      userId,
      clubId,
      dto.reason,
      dto.category,
    );
    if (result.reason === 'Already reported.') {
      throw new AppException('SOCIAL_REPORT_EXISTS', {
        message: ERROR_DEFINITIONS.SOCIAL_REPORT_EXISTS.message,
        details: { field: 'clubId' },
      });
    }

    await this.handleContentReportThreshold(ReportTargetType.CLUB, clubId);
    await this.handleClubReportThreshold(String(userId), clubId, club.hostId);
    return result;
  }

  async createArticleReport(
    userId: string,
    clubId: string,
    articleId: string,
    dto: CreateReportRequestDto,
  ) {
    const article = await this.reportRepository.findActiveArticleByClubId(
      clubId,
      articleId,
    );
    if (!article) {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    const result = await this.reportRepository.createArticleReport(
      userId,
      clubId,
      articleId,
      dto.reason,
      dto.category,
    );
    if (result.reason === 'Already reported.') {
      throw new AppException('SOCIAL_REPORT_EXISTS', {
        message: ERROR_DEFINITIONS.SOCIAL_REPORT_EXISTS.message,
        details: { field: 'articleId' },
      });
    }

    await this.createArticleReportNotification(
      String(userId),
      articleId,
      article.userId,
    );
    await this.handleContentReportThreshold(
      ReportTargetType.ARTICLE,
      articleId,
    );
    return result;
  }

  async createCommentReport(
    userId: string,
    clubId: string,
    articleId: string,
    commentId: string,
    dto: CreateReportRequestDto,
  ) {
    const article = await this.reportRepository.findActiveArticleByClubId(
      clubId,
      articleId,
    );
    if (!article) {
      throw new AppException('ARTICLE_NOT_FOUND');
    }

    const comment = await this.reportRepository.findActiveCommentByArticleId(
      articleId,
      commentId,
    );
    if (!comment) {
      throw new AppException('COMMENT_NOT_FOUND');
    }

    const result = await this.reportRepository.createCommentReport(
      userId,
      clubId,
      articleId,
      commentId,
      dto.reason,
      dto.category,
    );
    if (result.reason === 'Already reported.') {
      throw new AppException('SOCIAL_REPORT_EXISTS', {
        message: ERROR_DEFINITIONS.SOCIAL_REPORT_EXISTS.message,
        details: { field: 'commentId' },
      });
    }

    await this.handleContentReportThreshold(
      ReportTargetType.COMMENT,
      commentId,
    );
    return result;
  }

  private async assertUnifiedReportTarget(
    dto: CreateUnifiedReportRequestDto,
  ): Promise<void> {
    if (dto.targetType === ReportTargetType.CLUB) {
      const club = await this.reportRepository.findActiveClubById(dto.targetId);
      if (!club) throw new AppException('CLUB_NOT_FOUND');
      return;
    }

    if (dto.targetType === ReportTargetType.ARTICLE) {
      const article = await this.reportRepository.findActiveArticleById(
        dto.targetId,
      );
      if (!article) throw new AppException('ARTICLE_NOT_FOUND');
      return;
    }

    if (dto.targetType === ReportTargetType.COMMENT) {
      const comment = await this.reportRepository.findActiveCommentById(
        dto.targetId,
      );
      if (!comment) throw new AppException('COMMENT_NOT_FOUND');
      return;
    }

    if (
      dto.targetType === ReportTargetType.USER ||
      dto.targetType === ReportTargetType.PROFILE ||
      dto.targetType === ReportTargetType.VOICE
    ) {
      const user = await this.reportRepository.findActiveUserById(
        dto.targetUserId ?? dto.targetId,
      );
      if (!user) throw new AppException('SOCIAL_TARGET_USER_NOT_FOUND');
    }
  }

  private async handleContentReportThreshold(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    const reportCount = await this.reportRepository.countActiveTargetReports(
      targetType,
      targetId,
    );
    if (reportCount >= ReportService.CONTENT_REPORT_BLIND_THRESHOLD) {
      await this.reportRepository.blindReportedTarget(targetType, targetId);
    }
  }

  private async handleClubReportThreshold(
    reporterUserId: string,
    clubId: string,
    hostId: bigint | null,
  ): Promise<void> {
    const reportCount =
      await this.reportRepository.countActiveClubReports(clubId);

    if (hostId) {
      await this.notificationService.createNotification(
        Number(hostId),
        NotificationType.CLUB,
        '동호회 신고 알림',
        `5번 이상의 동호회 신고시에, 동호회가 비활성화됩니다. 현재 ${reportCount}번 신고되었습니다.`,
        Number(reporterUserId),
        {
          clubId,
          reportCount: reportCount.toString(),
        },
      );
    }

    if (reportCount >= ReportService.CLUB_REPORT_DEACTIVATION_THRESHOLD) {
      await this.reportRepository.deactivateClub(clubId);
    }
  }

  private async createArticleReportNotification(
    reporterUserId: string,
    articleId: string,
    authorId: bigint | null,
  ): Promise<void> {
    if (!authorId) {
      return;
    }

    const reportCount = await this.reportRepository.countActiveUserReports(
      authorId.toString(),
    );

    await this.notificationService.createNotification(
      Number(authorId),
      NotificationType.CLUB,
      '게시글 신고 알림',
      `신고 5번 이상 받았을 경우, 로그인이 제한됩니다. 현재 ${reportCount}번 신고되었습니다.`,
      Number(reporterUserId),
      {
        articleId,
        reportCount: reportCount.toString(),
      },
    );
  }
}
