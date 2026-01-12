import { Injectable } from '@nestjs/common';
import { ReportRepository } from '../../repositories/report.repository';

@Injectable()
export class ReportService {
  constructor(readonly reportRepository: ReportRepository) {}

  async createReport(userId: string, targetUserId: string, reason: string) {
    return this.reportRepository.createReport(userId, targetUserId, reason);
  }
}
