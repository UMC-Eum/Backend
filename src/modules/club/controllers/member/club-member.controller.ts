import {
  Body,
  Controller,
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
  ClubMemberResponseDto,
  CreateClubMemberRequestDto,
  UpdateClubMemberStatusRequestDto,
} from '../../dtos/club-member.dto';

@ApiTags('Club Members')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: '로그인 필요' })
@UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/members')
export class ClubMemberController {
  constructor(private readonly clubMemberService: ClubMemberService) {}

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
