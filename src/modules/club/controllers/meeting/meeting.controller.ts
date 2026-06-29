import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
  GetMeetingDetailResponseDto,
  UpdateMeetingRequestDto,
  UpdateMeetingResponseDto,
} from '../../dtos/meeting.dto';

@ApiTags('Meeting')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: '로그인 필요' })
@ApiForbiddenResponse({ description: '권한 없음' })
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

  @Get(':meetingId')
  @ApiOperation({ summary: '정모 상세 조회 (클럽 가입자만)' })
  @ApiOkResponse({
    description: '정모 상세 조회 성공',
    type: GetMeetingDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: '클럽 또는 정모를 찾을 수 없음' })
  async getMeetingDetail(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('meetingId', new ParsePositiveIntPipe()) meetingId: number,
  ): Promise<GetMeetingDetailResponseDto> {
    return this.meetingService.getMeetingDetail(
      BigInt(userId),
      BigInt(clubId),
      BigInt(meetingId),
    );
  }

  @Patch(':meetingId')
  @ApiOperation({ summary: '정모 수정 (호스트만)' })
  @ApiBody({ type: UpdateMeetingRequestDto })
  @ApiOkResponse({
    description: '정모 수정 완료',
    type: UpdateMeetingResponseDto,
  })
  @ApiNotFoundResponse({ description: '클럽 또는 정모를 찾을 수 없음' })
  @ApiConflictResponse({
    description: '현재 참석자 수보다 수용 인원을 낮출 수 없음',
  })
  async updateMeeting(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('meetingId', new ParsePositiveIntPipe()) meetingId: number,
    @Body() dto: UpdateMeetingRequestDto,
  ): Promise<UpdateMeetingResponseDto> {
    return this.meetingService.updateMeeting(
      BigInt(userId),
      BigInt(clubId),
      BigInt(meetingId),
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
