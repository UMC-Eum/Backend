import { Injectable } from '@nestjs/common';
import { ReportRepository } from '../../repositories/report.repository';

@Injectable()
export class ReportService {
  constructor(readonly reportRepository: ReportRepository) {}

  async createReport(
    userId: string,
    targetUserId: string,
    reason: string,
    category: string,
    chatRoomId: string,
  ) {
    return this.reportRepository.createReport(
      userId,
      targetUserId,
      reason,
      category,
      chatRoomId,
    );
  }
}
