import { Body, Controller, Post, Query } from '@nestjs/common';
import { ReportService } from '../../services/report/report.service';

@Controller('report')
export class ReportController {
  public constructor(private readonly reportService: ReportService) {}

  @Post()
  async createReport(
    @Query('userId') userId: string,
    @Body('targetUserId') targetUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.reportService.createReport(userId, targetUserId, reason);
  }
}
