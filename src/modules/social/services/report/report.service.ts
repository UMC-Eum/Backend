import { Injectable } from '@nestjs/common';
import { ReportRepository } from '../../repositories/report.repository';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_DEFINITIONS } from '../../../../common/errors/error-codes';

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
}
