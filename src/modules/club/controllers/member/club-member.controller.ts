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
import { ClubMemberService } from '../../services/member/club-member.service';
import {
  ClubMemberListResponseDto,
  ClubMemberRequestListResponseDto,
  ClubMemberResponseDto,
  CreateClubMemberRequestDto,
  LeaveClubMemberResponseDto,
  UpdateClubMemberStatusRequestDto,
} from '../../dtos/club-member.dto';

@ApiTags('Club Members')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: '로그인 필요' })
@UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/members')
export class ClubMemberController {
  constructor(private readonly clubMemberService: ClubMemberService) {}

  @Get('requests')
  @ApiOperation({ summary: '동호회 가입 신청 목록 조회 (호스트만)' })
  @ApiOkResponse({
    description: '가입 신청 목록 조회 완료',
    type: ClubMemberRequestListResponseDto,
  })
  @ApiForbiddenResponse({ description: '호스트가 아님' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  async getJoinRequests(
    @RequiredUserId() hostUserId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<ClubMemberRequestListResponseDto> {
    return this.clubMemberService.getJoinRequests(
      BigInt(hostUserId),
      BigInt(clubId),
    );
  }

  @Get()
  @ApiOperation({ summary: '동호회 가입자 목록 조회 (멤버만)' })
  @ApiOkResponse({
    description: '가입자 목록 조회 완료',
    type: ClubMemberListResponseDto,
  })
  @ApiForbiddenResponse({ description: '동호회 멤버가 아님' })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  async getMembers(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<ClubMemberListResponseDto> {
    return this.clubMemberService.getMembers(BigInt(userId), BigInt(clubId));
  }

  @Post()
  @ApiOperation({ summary: '동호회 가입 신청' })
  @ApiBody({ type: CreateClubMemberRequestDto })
  @ApiCreatedResponse({
    description: '가입 신청 완료',
    type: ClubMemberResponseDto,
  })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  @ApiConflictResponse({ description: '이미 가입했거나 가입 신청 중' })
  async requestJoin(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Body() dto: CreateClubMemberRequestDto,
  ): Promise<ClubMemberResponseDto> {
    return this.clubMemberService.requestJoin(
      BigInt(userId),
      BigInt(clubId),
      dto,
    );
  }

  @Delete('me')
  @ApiOperation({ summary: '동호회 탈퇴' })
  @ApiOkResponse({
    description: '동호회 탈퇴 완료',
    type: LeaveClubMemberResponseDto,
  })
  @ApiForbiddenResponse({
    description: '동호회 멤버가 아니거나 호스트 탈퇴 불가',
  })
  @ApiNotFoundResponse({ description: '클럽을 찾을 수 없음' })
  async leave(
    @RequiredUserId() userId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
  ): Promise<LeaveClubMemberResponseDto> {
    return this.clubMemberService.leave(BigInt(userId), BigInt(clubId));
  }

  @Delete(':userId')
  @ApiOperation({ summary: '동호회 멤버 강퇴 (호스트만)' })
  @ApiOkResponse({
    description: '동호회 멤버 강퇴 완료',
    type: LeaveClubMemberResponseDto,
  })
  @ApiForbiddenResponse({
    description: '호스트가 아니거나 자기 자신 강퇴 불가',
  })
  @ApiNotFoundResponse({ description: '클럽 또는 멤버를 찾을 수 없음' })
  async kick(
    @RequiredUserId() hostUserId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('userId', new ParsePositiveIntPipe()) userId: number,
  ): Promise<LeaveClubMemberResponseDto> {
    return this.clubMemberService.kick(
      BigInt(hostUserId),
      BigInt(clubId),
      BigInt(userId),
    );
  }

  @Patch(':userId')
  @ApiOperation({ summary: '동호회 가입 신청 승인/거절 (호스트만)' })
  @ApiBody({ type: UpdateClubMemberStatusRequestDto })
  @ApiOkResponse({
    description: '가입 신청 처리 완료',
    type: ClubMemberResponseDto,
  })
  @ApiForbiddenResponse({ description: '호스트가 아님' })
  @ApiNotFoundResponse({ description: '클럽 또는 가입 신청을 찾을 수 없음' })
  async updateJoinRequestStatus(
    @RequiredUserId() hostUserId: number,
    @Param('clubId', new ParsePositiveIntPipe()) clubId: number,
    @Param('userId', new ParsePositiveIntPipe()) userId: number,
    @Body() dto: UpdateClubMemberStatusRequestDto,
  ): Promise<ClubMemberResponseDto> {
    return this.clubMemberService.updateJoinRequestStatus(
      BigInt(hostUserId),
      BigInt(clubId),
      BigInt(userId),
      dto,
    );
  }
}
