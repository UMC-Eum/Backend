import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClubAuthority, ClubUserStatus } from '@prisma/client';
import { RequiredUserId } from '../../../auth/decorators';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import type {
  ChangeClubMemberAuthorityRequestDto,
  JoinClubRequestDto,
  KickClubMemberRequestDto,
  PermitClubMemberRequestDto,
} from '../../dtos/member.dto';
import { MemberService } from '../../services/member/member.service';

@ApiTags('Club Member')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('clubs/:clubId/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @ApiOperation({ summary: '가입자 목록 조회' })
  async list(
    @RequiredUserId() me: number,
    @Param('clubId') clubId: string,
    @Query('status') status: ClubUserStatus = 'ACTIVE',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.memberService.list(BigInt(clubId), BigInt(me), status, cursor, limit ? Number(limit) : 30);
  }

  @Post()
  @ApiOperation({ summary: '가입 신청' })
  async join(@RequiredUserId() userId: number, @Param('clubId') clubId: string, @Body() body: JoinClubRequestDto) {
    return this.memberService.join(BigInt(userId), BigInt(clubId), body.message);
  }

  @Delete('me')
  @ApiOperation({ summary: '탈퇴' })
  async leave(@RequiredUserId() userId: number, @Param('clubId') clubId: string) {
    return this.memberService.leave(BigInt(clubId), BigInt(userId));
  }

  @Patch(':userId')
  @ApiOperation({ summary: '가입 승인/거절' })
  async permit(
    @RequiredUserId() hostId: number,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
    @Body() body: PermitClubMemberRequestDto,
  ) {
    return this.memberService.permit(BigInt(clubId), BigInt(hostId), BigInt(userId), body.status);
  }

  @Delete(':userId')
  @ApiOperation({ summary: '강퇴' })
  async kick(
    @RequiredUserId() hostId: number,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
    @Body() _body: KickClubMemberRequestDto,
  ) {
    return this.memberService.kick(BigInt(clubId), BigInt(hostId), BigInt(userId));
  }

  @Patch(':userId/authority')
  @ApiOperation({ summary: '권한 변경' })
  async changeAuthority(
    @RequiredUserId() hostId: number,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
    @Body() body: ChangeClubMemberAuthorityRequestDto,
  ) {
    return this.memberService.changeAuthority(
      BigInt(clubId),
      BigInt(hostId),
      BigInt(userId),
      body.authority as ClubAuthority,
    );
  }
}
