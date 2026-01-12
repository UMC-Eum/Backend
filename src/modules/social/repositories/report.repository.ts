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
  ): Promise<ReportResponseDto> {
    const response = await this.prisma.report.create({
      data: {
        reportedById: BigInt(userId),
        reportedId: BigInt(targetUserId),
        reason,
        reportedAt: new Date(),
      },
    });
    return { reportId: Number(response.id) };
  }
}
