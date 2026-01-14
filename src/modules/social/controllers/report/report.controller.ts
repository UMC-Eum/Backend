import { Body, Controller, Post } from '@nestjs/common';
import { ReportService } from '../../services/report/report.service';
import { RequiredUserId } from '../../../auth/decorators';

@Controller('report')
export class ReportController {
  public constructor(private readonly reportService: ReportService) {}

  @Post()
  async createReport(
    @RequiredUserId() userId: string,
    @Body('targetUserId') targetUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.reportService.createReport(userId, targetUserId, reason);
  }
}
