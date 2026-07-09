import { Injectable } from '@nestjs/common';
import { NotificationType, ReportCategory } from '@prisma/client';
import { ReportRepository } from '../../repositories/report.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';
import { CreateReportRequestDto } from '../../dtos/report.dto';
import { NotificationService } from '../../../notification/services/notification.service';

@Injectable()
export class ReportService {
  private static readonly CLUB_REPORT_DEACTIVATION_THRESHOLD = 5;

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
    return result;
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
