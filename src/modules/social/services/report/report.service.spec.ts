import { Test, TestingModule } from '@nestjs/testing';
import { ReportCategory, ReportTargetType } from '@prisma/client';
import { ReportService } from './report.service';
import { ReportRepository } from '../../repositories/report.repository';
import { NotificationService } from '../../../notification/services/notification.service';

describe('ReportService', () => {
  let service: ReportService;
  const reportRepository = {
    createReport: jest.fn(),
    createUnifiedReport: jest.fn(),
    findActiveUserById: jest.fn(),
    findActiveClubById: jest.fn(),
    findActiveArticleById: jest.fn(),
    findActiveArticleByClubId: jest.fn(),
    findActiveCommentById: jest.fn(),
    findActiveCommentByArticleId: jest.fn(),
    countActiveTargetReports: jest.fn(),
    blindReportedTarget: jest.fn(),
    countActiveClubReports: jest.fn(),
    countActiveUserReports: jest.fn(),
    deactivateClub: jest.fn(),
    createClubReport: jest.fn(),
    createArticleReport: jest.fn(),
    createCommentReport: jest.fn(),
  };
  const notificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(reportRepository).forEach((mock) => mock.mockReset());
    notificationService.createNotification.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: ReportRepository,
          useValue: reportRepository,
        },
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('통합 프로필 신고를 생성한다', async () => {
    reportRepository.findActiveUserById.mockResolvedValue({ id: 40n });
    reportRepository.createUnifiedReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
      targetType: ReportTargetType.PROFILE,
      targetId: 40,
    });
    reportRepository.countActiveTargetReports.mockResolvedValue(1);

    const result = await service.createUnifiedReport('7', {
      targetType: ReportTargetType.PROFILE,
      targetId: '40',
      reasonCode: ReportCategory.SPAM,
      detail: '스팸입니다.',
      targetUserId: '40',
      chatRoomId: '123',
    });

    expect(reportRepository.findActiveUserById).toHaveBeenCalledWith('40');
    expect(reportRepository.createUnifiedReport).toHaveBeenCalledWith({
      userId: '7',
      targetType: ReportTargetType.PROFILE,
      targetId: '40',
      reason: '스팸입니다.',
      category: ReportCategory.SPAM,
      targetUserId: '40',
      chatRoomId: '123',
    });
    expect(reportRepository.countActiveTargetReports).toHaveBeenCalledWith(
      ReportTargetType.PROFILE,
      '40',
    );
    expect(reportRepository.blindReportedTarget).not.toHaveBeenCalled();
    expect(result.targetId).toBe(40);
  });

  it('통합 게시글 신고가 3번 이상이면 블라인드 처리한다', async () => {
    reportRepository.findActiveArticleById.mockResolvedValue({
      id: 345n,
      clubId: 12n,
      userId: 88n,
    });
    reportRepository.createUnifiedReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
      targetType: ReportTargetType.ARTICLE,
      targetId: 345,
    });
    reportRepository.countActiveTargetReports.mockResolvedValue(3);

    await service.createUnifiedReport('7', {
      targetType: ReportTargetType.ARTICLE,
      targetId: '345',
      reasonCode: ReportCategory.ABUSE,
      detail: '욕설입니다.',
    });

    expect(reportRepository.blindReportedTarget).toHaveBeenCalledWith(
      ReportTargetType.ARTICLE,
      '345',
    );
  });

  it('동호회 신고를 생성한다', async () => {
    reportRepository.findActiveClubById.mockResolvedValue({
      id: 12n,
      hostId: 99n,
    });
    reportRepository.createClubReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
      clubId: 12,
    });
    reportRepository.countActiveClubReports.mockResolvedValue(3);
    reportRepository.countActiveTargetReports.mockResolvedValue(3);

    const result = await service.createClubReport('7', '12', {
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
    });

    expect(reportRepository.findActiveClubById).toHaveBeenCalledWith('12');
    expect(reportRepository.createClubReport).toHaveBeenCalledWith(
      '7',
      '12',
      '스팸입니다.',
      ReportCategory.SPAM,
    );
    expect(reportRepository.countActiveClubReports).toHaveBeenCalledWith('12');
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      99,
      'CLUB',
      '동호회 신고 알림',
      '5번 이상의 동호회 신고시에, 동호회가 비활성화됩니다. 현재 3번 신고되었습니다.',
      7,
      {
        clubId: '12',
        reportCount: '3',
      },
    );
    expect(reportRepository.deactivateClub).not.toHaveBeenCalled();
    expect(result.clubId).toBe(12);
  });

  it('동호회 신고가 5번 이상이면 동호회를 비활성화한다', async () => {
    reportRepository.findActiveClubById.mockResolvedValue({
      id: 12n,
      hostId: 99n,
    });
    reportRepository.createClubReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
      clubId: 12,
    });
    reportRepository.countActiveClubReports.mockResolvedValue(5);
    reportRepository.countActiveTargetReports.mockResolvedValue(5);

    await service.createClubReport('7', '12', {
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
    });

    expect(reportRepository.deactivateClub).toHaveBeenCalledWith('12');
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      99,
      'CLUB',
      '동호회 신고 알림',
      '5번 이상의 동호회 신고시에, 동호회가 비활성화됩니다. 현재 5번 신고되었습니다.',
      7,
      {
        clubId: '12',
        reportCount: '5',
      },
    );
  });

  it('동호회가 없으면 CLUB_NOT_FOUND', async () => {
    reportRepository.findActiveClubById.mockResolvedValue(null);

    await expect(
      service.createClubReport('7', '12', {
        category: ReportCategory.SPAM,
        reason: '스팸입니다.',
      }),
    ).rejects.toMatchObject({ internalCode: 'CLUB_NOT_FOUND' });
    expect(reportRepository.createClubReport).not.toHaveBeenCalled();
  });

  it('이미 신고한 동호회면 SOCIAL_REPORT_EXISTS', async () => {
    reportRepository.findActiveClubById.mockResolvedValue({
      id: 12n,
      hostId: 99n,
    });
    reportRepository.createClubReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: 'Already reported.',
      clubId: 12,
    });

    await expect(
      service.createClubReport('7', '12', {
        category: ReportCategory.SPAM,
        reason: '스팸입니다.',
      }),
    ).rejects.toMatchObject({ internalCode: 'SOCIAL_REPORT_EXISTS' });
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('동호회 게시글 신고를 생성한다', async () => {
    reportRepository.findActiveArticleByClubId.mockResolvedValue({
      id: 345n,
      clubId: 12n,
      userId: 88n,
    });
    reportRepository.createArticleReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
      clubId: 12,
      articleId: 345,
    });
    reportRepository.countActiveUserReports.mockResolvedValue(4);
    reportRepository.countActiveTargetReports.mockResolvedValue(2);

    const result = await service.createArticleReport('7', '12', '345', {
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
    });

    expect(reportRepository.findActiveArticleByClubId).toHaveBeenCalledWith(
      '12',
      '345',
    );
    expect(reportRepository.createArticleReport).toHaveBeenCalledWith(
      '7',
      '12',
      '345',
      '욕설입니다.',
      ReportCategory.ABUSE,
    );
    expect(reportRepository.countActiveUserReports).toHaveBeenCalledWith('88');
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      88,
      'CLUB',
      '게시글 신고 알림',
      '신고 5번 이상 받았을 경우, 로그인이 제한됩니다. 현재 4번 신고되었습니다.',
      7,
      {
        articleId: '345',
        reportCount: '4',
      },
    );
    expect(result.articleId).toBe(345);
  });

  it('게시글이 없으면 ARTICLE_NOT_FOUND', async () => {
    reportRepository.findActiveArticleByClubId.mockResolvedValue(null);

    await expect(
      service.createArticleReport('7', '12', '345', {
        category: ReportCategory.ABUSE,
        reason: '욕설입니다.',
      }),
    ).rejects.toMatchObject({ internalCode: 'ARTICLE_NOT_FOUND' });
    expect(reportRepository.createArticleReport).not.toHaveBeenCalled();
  });

  it('댓글 신고를 생성한다', async () => {
    reportRepository.findActiveArticleByClubId.mockResolvedValue({
      id: 345n,
      clubId: 12n,
      userId: 88n,
    });
    reportRepository.findActiveCommentByArticleId.mockResolvedValue({
      id: 678n,
      articleId: 345n,
      userId: 77n,
    });
    reportRepository.createCommentReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
      clubId: 12,
      articleId: 345,
      commentId: 678,
    });
    reportRepository.countActiveTargetReports.mockResolvedValue(2);
    const result = await service.createCommentReport('7', '12', '345', '678', {
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
    });

    expect(reportRepository.findActiveArticleByClubId).toHaveBeenCalledWith(
      '12',
      '345',
    );
    expect(reportRepository.findActiveCommentByArticleId).toHaveBeenCalledWith(
      '345',
      '678',
    );
    expect(reportRepository.createCommentReport).toHaveBeenCalledWith(
      '7',
      '12',
      '345',
      '678',
      '욕설입니다.',
      ReportCategory.ABUSE,
    );
    expect(reportRepository.countActiveUserReports).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
    expect(result.commentId).toBe(678);
  });

  it('댓글이 없으면 COMMENT_NOT_FOUND', async () => {
    reportRepository.findActiveArticleByClubId.mockResolvedValue({
      id: 345n,
      clubId: 12n,
      userId: 88n,
    });
    reportRepository.findActiveCommentByArticleId.mockResolvedValue(null);

    await expect(
      service.createCommentReport('7', '12', '345', '678', {
        category: ReportCategory.ABUSE,
        reason: '욕설입니다.',
      }),
    ).rejects.toMatchObject({ internalCode: 'COMMENT_NOT_FOUND' });
    expect(reportRepository.createCommentReport).not.toHaveBeenCalled();
  });

  it('이미 신고한 댓글이면 SOCIAL_REPORT_EXISTS', async () => {
    reportRepository.findActiveArticleByClubId.mockResolvedValue({
      id: 345n,
      clubId: 12n,
      userId: 88n,
    });
    reportRepository.findActiveCommentByArticleId.mockResolvedValue({
      id: 678n,
      articleId: 345n,
      userId: 77n,
    });
    reportRepository.createCommentReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: 'Already reported.',
      clubId: 12,
      articleId: 345,
      commentId: 678,
    });

    await expect(
      service.createCommentReport('7', '12', '345', '678', {
        category: ReportCategory.ABUSE,
        reason: '욕설입니다.',
      }),
    ).rejects.toMatchObject({ internalCode: 'SOCIAL_REPORT_EXISTS' });
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });
});
