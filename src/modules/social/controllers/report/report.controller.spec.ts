import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReportCategory, ReportTargetType } from '@prisma/client';
import { JwtTokenService } from '../../../auth/services/jwt-token.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ReportService } from '../../services/report/report.service';
import { ReportController } from './report.controller';

describe('ReportController', () => {
  let controller: ReportController;
  const reportService = {
    createUnifiedReport: jest.fn(),
    createReport: jest.fn(),
    createClubReport: jest.fn(),
    createArticleReport: jest.fn(),
    createCommentReport: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(reportService).forEach((mock) => mock.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: JwtTokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
            extractTokenFromHeader: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: ReportService,
          useValue: reportService,
        },
        AccessTokenGuard,
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('통합 신고 요청을 서비스로 위임한다', async () => {
    const dto = {
      targetType: ReportTargetType.PROFILE,
      targetId: '40',
      reasonCode: ReportCategory.SPAM,
      detail: '스팸입니다.',
      targetUserId: '40',
      chatRoomId: '123',
    };
    reportService.createUnifiedReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
      targetType: ReportTargetType.PROFILE,
      targetId: 40,
    });

    await controller.createUnifiedReport(7, dto);

    expect(reportService.createUnifiedReport).toHaveBeenCalledWith('7', dto);
  });

  it('동호회 신고 요청을 서비스로 위임한다', async () => {
    reportService.createClubReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
      clubId: 12,
    });

    await controller.createClubReport(7, 12, {
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
    });

    expect(reportService.createClubReport).toHaveBeenCalledWith('7', '12', {
      category: ReportCategory.SPAM,
      reason: '스팸입니다.',
    });
  });

  it('동호회 게시글 신고 요청을 서비스로 위임한다', async () => {
    reportService.createArticleReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
      clubId: 12,
      articleId: 345,
    });

    await controller.createArticleReport(7, 12, 345, {
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
    });

    expect(reportService.createArticleReport).toHaveBeenCalledWith(
      '7',
      '12',
      '345',
      {
        category: ReportCategory.ABUSE,
        reason: '욕설입니다.',
      },
    );
  });

  it('동호회 게시글 댓글 신고 요청을 서비스로 위임한다', async () => {
    reportService.createCommentReport.mockResolvedValue({
      reportId: 1,
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
      clubId: 12,
      articleId: 345,
      commentId: 678,
    });

    await controller.createCommentReport(7, 12, 345, 678, {
      category: ReportCategory.ABUSE,
      reason: '욕설입니다.',
    });

    expect(reportService.createCommentReport).toHaveBeenCalledWith(
      '7',
      '12',
      '345',
      '678',
      {
        category: ReportCategory.ABUSE,
        reason: '욕설입니다.',
      },
    );
  });
});
