import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ReportResponseDto } from '../dtos/report.dto';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    userId: string,
    targetUserId: string,
    reason: string,
    category: string,
    chatRoomId: string,
  ): Promise<ReportResponseDto> {
    const exist = await this.prisma.report.findUnique({
      where: {
        reportedById_reportedId: {
          reportedById: BigInt(userId),
          reportedId: BigInt(targetUserId),
        },
      },
      select: { id: true },
    });
    if (exist != null) {
      return {
        reportId: Number(exist.id),
        category: category,
        reason: 'Already reported.',
        chatRoomId: Number(chatRoomId),
      };
    }
    const response = await this.prisma.report.create({
      data: {
        reportedById: BigInt(userId),
        reportedId: BigInt(targetUserId),
        reason,
        category,
        chatRoomId: BigInt(chatRoomId),
        reportedAt: new Date(),
      },
    });
    return {
      reportId: Number(response.id),
      category: category,
      reason: reason,
      chatRoomId: Number(chatRoomId),
    };
  }
}
