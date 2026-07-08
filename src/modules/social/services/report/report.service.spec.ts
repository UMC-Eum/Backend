import { Test, TestingModule } from '@nestjs/testing';
import { ReportCategory } from '@prisma/client';
import { ReportService } from './report.service';
import { ReportRepository } from '../../repositories/report.repository';
import { NotificationService } from '../../../notification/services/notification.service';

describe('ReportService', () => {
  let service: ReportService;
  const reportRepository = {
    createReport: jest.fn(),
    findActiveClubById: jest.fn(),
    findActiveArticleByClubId: jest.fn(),
    countActiveClubReports: jest.fn(),
    countActiveUserReports: jest.fn(),
    createClubReport: jest.fn(),
    createArticleReport: jest.fn(),
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
    expect(result.clubId).toBe(12);
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
});
