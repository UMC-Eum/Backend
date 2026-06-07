import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { RequiredUserId } from '../../../auth/decorators';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';
import { MeetingService } from '../../services/meeting/meeting.service';
import {
  CreateMeetingRequestDto,
  CreateMeetingResponseDto,
  DeleteMeetingResponseDto,
} from '../../dtos/meeting.dto';

@ApiTags('Meeting')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: '로그인 필요' })
@ApiForbiddenResponse({ description: '호스트가 아님' })
@UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({ summary: '정모 생성 (호스트만)' })
  @ApiBody({ type: CreateMeetingRequestDto })
  @ApiCreatedResponse({
    description: '정모 생성 완료',
    type: CreateMeetingResponseDto,
  })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  async createMeeting(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Body() dto: CreateMeetingRequestDto,
  ): Promise<CreateMeetingResponseDto> {
    return this.meetingService.createMeeting(
      BigInt(userId),
      BigInt(clubId),
      dto,
    );
  }

  @Delete(':meetingId')
  @ApiOperation({ summary: '정모 삭제 (호스트만, soft delete)' })
  @ApiOkResponse({
    description: '정모 삭제 완료',
    type: DeleteMeetingResponseDto,
  })
  @ApiNotFoundResponse({ description: '클럽 또는 정모를 찾을 수 없음' })
  async deleteMeeting(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('meetingId', new ParsePositiveIntPipe()) meetingId: number,
  ): Promise<DeleteMeetingResponseDto> {
    return this.meetingService.deleteMeeting(
      BigInt(userId),
      BigInt(clubId),
      BigInt(meetingId),
    );
  }
}
