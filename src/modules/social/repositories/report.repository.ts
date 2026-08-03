import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Report,
  ReportCategory,
  ReportTargetType,
} from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  ReportCreatedResponseDto,
  ReportResponseDto,
} from '../dtos/report.dto';

const COMMENT_REPORT_TARGET: ReportTargetType = 'COMMENT';
const USER_RELATED_REPORT_TARGETS = new Set<ReportTargetType>([
  ReportTargetType.USER,
  ReportTargetType.PROFILE,
  ReportTargetType.VOICE,
]);

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveClubById(clubId: string) {
    return this.prisma.club.findFirst({
      where: { id: BigInt(clubId), deletedAt: null },
      select: { id: true, hostId: true },
    });
  }

  findActiveArticleByClubId(clubId: string, articleId: string) {
    return this.prisma.article.findFirst({
      where: {
        id: BigInt(articleId),
        clubId: BigInt(clubId),
        deletedAt: null,
      },
      select: { id: true, clubId: true, userId: true },
    });
  }

  findActiveArticleById(articleId: string) {
    return this.prisma.article.findFirst({
      where: {
        id: BigInt(articleId),
        deletedAt: null,
      },
      select: { id: true, clubId: true, userId: true },
    });
  }

  findActiveCommentByArticleId(articleId: string, commentId: string) {
    return this.prisma.comment.findFirst({
      where: {
        id: BigInt(commentId),
        articleId: BigInt(articleId),
        deletedAt: null,
        article: {
          deletedAt: null,
        },
      },
      select: { id: true, articleId: true, userId: true },
    });
  }

  findActiveCommentById(commentId: string) {
    return this.prisma.comment.findFirst({
      where: {
        id: BigInt(commentId),
        deletedAt: null,
        article: {
          deletedAt: null,
        },
      },
      select: { id: true, articleId: true, userId: true },
    });
  }

  findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: BigInt(userId),
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  countActiveClubReports(clubId: string) {
    return this.prisma.clubReport.count({
      where: {
        reportedClubId: BigInt(clubId),
        report: { deletedAt: null },
      },
    });
  }

  deactivateClub(clubId: string) {
    return this.prisma.club.updateMany({
      where: {
        id: BigInt(clubId),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  countActiveUserReports(userId: string) {
    return this.prisma.userReport.count({
      where: {
        reportedUserId: BigInt(userId),
        report: { deletedAt: null },
      },
    });
  }

  countActiveTargetReports(targetType: ReportTargetType, targetId: string) {
    return this.prisma.report.count({
      where: {
        targetType,
        targetId: BigInt(targetId),
        deletedAt: null,
      },
    });
  }

  async blindReportedTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    const id = BigInt(targetId);
    if (targetType === ReportTargetType.ARTICLE) {
      await this.prisma.article.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }

    if (targetType === ReportTargetType.COMMENT) {
      await this.prisma.comment.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }
  }

  async createUnifiedReport(params: {
    userId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    category: ReportCategory;
    targetUserId?: string;
    chatRoomId?: string;
  }): Promise<ReportCreatedResponseDto> {
    const exist = await this.findExistingTargetReport(
      params.userId,
      params.targetType,
      params.targetId,
    );
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category: params.category,
        reason: 'Already reported.',
        targetType: params.targetType,
        targetId: Number(params.targetId),
      };
    }

    const relatedUserId = this.resolveReportedUserId(params);
    const result = await this.createTargetReport({
      userId: params.userId,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      category: params.category,
      chatRoomId: params.chatRoomId,
      createLegacyTarget: relatedUserId
        ? async (tx, reportId) => {
            await tx.userReport.create({
              data: {
                reportId,
                reportedUserId: BigInt(relatedUserId),
              },
            });
          }
        : undefined,
    });

    if (!result.created) {
      return {
        reportId: Number(result.report.id),
        category: params.category,
        reason: 'Already reported.',
        targetType: params.targetType,
        targetId: Number(params.targetId),
      };
    }

    return {
      reportId: Number(result.report.id),
      category: params.category,
      reason: params.reason,
      targetType: params.targetType,
      targetId: Number(params.targetId),
    };
  }

  private resolveReportedUserId(params: {
    targetType: ReportTargetType;
    targetId: string;
    targetUserId?: string;
  }): string | undefined {
    if (!USER_RELATED_REPORT_TARGETS.has(params.targetType)) {
      return params.targetUserId;
    }
    return params.targetUserId ?? params.targetId;
  }

  async createReport(
    userId: string,
    targetUserId: string,
    reason: string,
    category: ReportCategory,
    chatRoomId?: string,
  ): Promise<ReportResponseDto> {
    const exist = await this.findExistingTargetReport(
      userId,
      ReportTargetType.USER,
      targetUserId,
    );
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category,
        reason: 'Already reported.',
        chatRoomId: Number(chatRoomId ?? 0),
      };
    }

    const result = await this.createTargetReport({
      userId,
      targetType: ReportTargetType.USER,
      targetId: targetUserId,
      reason,
      category,
      chatRoomId,
      createLegacyTarget: async (tx, reportId) => {
        await tx.userReport.create({
          data: {
            reportId,
            reportedUserId: BigInt(targetUserId),
          },
        });
      },
    });
    if (!result.created) {
      return {
        reportId: Number(result.report.id),
        category,
        reason: 'Already reported.',
        chatRoomId: Number(chatRoomId ?? 0),
      };
    }

    return {
      reportId: Number(result.report.id),
      category,
      reason,
      chatRoomId: Number(chatRoomId ?? 0),
    };
  }

  private findExistingTargetReport(
    userId: string,
    targetType: ReportTargetType,
    targetId: string,
  ) {
    return this.prisma.report.findFirst({
      where: {
        reportedById: BigInt(userId),
        targetType,
        targetId: BigInt(targetId),
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  private async createTargetReport(params: {
    userId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    category: ReportCategory;
    chatRoomId?: string;
    createLegacyTarget?: (
      tx: Prisma.TransactionClient,
      reportId: bigint,
    ) => Promise<void>;
  }): Promise<{ report: Report; created: boolean }> {
    try {
      const report = await this.prisma.$transaction(async (tx) => {
        const report = await tx.report.create({
          data: {
            reportedById: BigInt(params.userId),
            targetType: params.targetType,
            targetId: BigInt(params.targetId),
            chatRoomId: params.chatRoomId ? BigInt(params.chatRoomId) : null,
            reason: params.reason,
            category: params.category,
            reportedAt: new Date(),
          },
        });
        await params.createLegacyTarget?.(tx, report.id);
        return report;
      });
      return { report, created: true };
    } catch (error) {
      if (!this.isUniqueReportTargetError(error)) {
        throw error;
      }

      const existing = await this.findExistingTargetReport(
        params.userId,
        params.targetType,
        params.targetId,
      );
      if (!existing) {
        throw error;
      }

      const report = await this.prisma.report.findUniqueOrThrow({
        where: { id: existing.id },
      });
      return { report, created: false };
    }
  }

  private isUniqueReportTargetError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async createClubReport(
    userId: string,
    clubId: string,
    reason: string,
    category: ReportCategory,
  ): Promise<ReportCreatedResponseDto> {
    const exist = await this.findExistingTargetReport(
      userId,
      ReportTargetType.CLUB,
      clubId,
    );
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
      };
    }

    const result = await this.createTargetReport({
      userId,
      targetType: ReportTargetType.CLUB,
      targetId: clubId,
      reason,
      category,
      createLegacyTarget: async (tx, reportId) => {
        await tx.clubReport.create({
          data: {
            reportId,
            reportedClubId: BigInt(clubId),
          },
        });
      },
    });
    if (!result.created) {
      return {
        reportId: Number(result.report.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
      };
    }

    return {
      reportId: Number(result.report.id),
      category,
      reason,
      clubId: Number(clubId),
    };
  }

  async createArticleReport(
    userId: string,
    clubId: string,
    articleId: string,
    reason: string,
    category: ReportCategory,
  ): Promise<ReportCreatedResponseDto> {
    const exist = await this.findExistingTargetReport(
      userId,
      ReportTargetType.ARTICLE,
      articleId,
    );
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
        articleId: Number(articleId),
      };
    }

    const result = await this.createTargetReport({
      userId,
      targetType: ReportTargetType.ARTICLE,
      targetId: articleId,
      reason,
      category,
      createLegacyTarget: async (tx, reportId) => {
        const article = await tx.article.findUnique({
          where: { id: BigInt(articleId) },
          select: { userId: true },
        });
        if (!article?.userId) {
          return;
        }

        await tx.userReport.create({
          data: {
            reportId,
            reportedUserId: article.userId,
          },
        });
      },
    });
    if (!result.created) {
      return {
        reportId: Number(result.report.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
        articleId: Number(articleId),
      };
    }

    return {
      reportId: Number(result.report.id),
      category,
      reason,
      clubId: Number(clubId),
      articleId: Number(articleId),
    };
  }

  async createCommentReport(
    userId: string,
    clubId: string,
    articleId: string,
    commentId: string,
    reason: string,
    category: ReportCategory,
  ): Promise<ReportCreatedResponseDto> {
    const exist = await this.findExistingTargetReport(
      userId,
      COMMENT_REPORT_TARGET,
      commentId,
    );
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
        articleId: Number(articleId),
        commentId: Number(commentId),
      };
    }

    const result = await this.createTargetReport({
      userId,
      targetType: COMMENT_REPORT_TARGET,
      targetId: commentId,
      reason,
      category,
      createLegacyTarget: async (tx, reportId) => {
        const comment = await tx.comment.findUnique({
          where: { id: BigInt(commentId) },
          select: { userId: true },
        });
        if (!comment?.userId) {
          return;
        }

        await tx.userReport.create({
          data: {
            reportId,
            reportedUserId: comment.userId,
          },
        });
      },
    });
    if (!result.created) {
      return {
        reportId: Number(result.report.id),
        category,
        reason: 'Already reported.',
        clubId: Number(clubId),
        articleId: Number(articleId),
        commentId: Number(commentId),
      };
    }

    return {
      reportId: Number(result.report.id),
      category,
      reason,
      clubId: Number(clubId),
      articleId: Number(articleId),
      commentId: Number(commentId),
    };
  }
}
