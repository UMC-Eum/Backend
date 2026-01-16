import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReportService } from '../../services/report/report.service';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';

@ApiTags('Report')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('report')
export class ReportController {
  public constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: '사용자 신고 생성' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', example: '40' },
        reason: {
          type: 'string',
          example: '불쾌한 메시지를 반복 전송',
        },
        category: {
          type: 'string',
          example: 'HARASSMENT',
          description: '신고 유형 코드',
        },
        chatRoomId: {
          type: 'string',
          example: '123',
          description: '관련된 채팅방 ID',
        },
      },
      required: ['targetUserId', 'reason'],
    },
  })
  @ApiCreatedResponse({ description: '신고 접수 완료' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async createReport(
    @RequiredUserId() userId: number,
    @Body('targetUserId') targetUserId: string,
    @Body('reason') reason: string,
    @Body('category') category: string,
    @Body('chatRoomId') chatRoomId: string,
  ) {
    return this.reportService.createReport(
      String(userId),
      targetUserId,
      reason,
      category,
      chatRoomId,
    );
  }
}
