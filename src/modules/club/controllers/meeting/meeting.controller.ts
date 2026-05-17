import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUserId } from '../../../auth/decorators';
import { MeetingService } from '../../services/meeting/meeting.service';
import type {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
} from '../../dtos/meeting.dto';

@ApiTags('Meeting')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({ summary: '정모 생성 (호스트만)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: '매주하는 새벽등산' },
        introText: {
          type: 'string',
          example: '함께 새벽 산행할 분들 모집해요.',
        },
        date: { type: 'string', example: '매주 목요일 저녁 19시' },
        spot: { type: 'string', example: '종로역 1번 출구 앞' },
        capacity: { type: 'integer', example: 15 },
        cost: { type: 'string', example: '1인 10,000원', nullable: true },
        joinPolicy: {
          type: 'string',
          enum: ['AUTO', 'APPROVAL_REQUIRED'],
          example: 'AUTO',
        },
      },
      required: ['name', 'introText', 'date', 'spot', 'capacity', 'joinPolicy'],
    },
  })
  @ApiCreatedResponse({ description: '정모 생성 완료' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiForbiddenResponse({ description: '호스트가 아님' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  async createMeeting(
    @RequiredUserId() userId: number,
    @Param('clubId') clubId: string,
    @Body() dto: CreateMeetingRequestDto,
  ): Promise<CreateMeetingResponseDto> {
    return this.meetingService.createMeeting(
      BigInt(userId),
      BigInt(clubId),
      dto,
    );
  }
}
