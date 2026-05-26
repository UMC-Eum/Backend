import { Body, Controller, Get, Patch, Put, UseGuards, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { UserMeResponseDto } from '../../dtos/user-me-response.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
import { UserInterestsUpdateRequestDto } from '../../dtos/user-interests-update-request.dto';
import { UserPersonalitiesUpdateRequestDto } from '../../dtos/user-personalities-update-request.dto';
import { UserIdealPersonalitiesUpdateRequestDto } from '../../dtos/user-ideal-personalities-update-request.dto';
import { UserService } from '../../services/user/user.service';

@ApiTags('User')
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer access token',
  required: true,
})
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get my profile' })
  @ApiOkResponse({ type: UserMeResponseDto })
  getMe(@CurrentUser('userId') userId: number | null) {
    return this.userService.getMe(userId ?? 0);
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my profile' })
  @ApiOkResponse({ type: UserMeResponseDto })
  updateMe(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserProfileUpdateRequestDto,
  ) {
    return this.userService.updateMe(userId ?? 0, body);
  }

  @Patch('me/deactivate')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Deactivate my profile' })
  @ApiOkResponse({ schema: { example: null } })
  deactivateMe(@CurrentUser('userId') userId: number | null) {
    return this.userService.deactivateMe(userId ?? 0);
  }

  @Put('me/interests')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my interests' })
  @ApiOkResponse({ schema: { example: null } })
  updateInterests(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserInterestsUpdateRequestDto,
  ) {
    return this.userService.updateInterests(userId ?? 0, body);
  }

  @Put('me/personalities')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my personalities' })
  @ApiOkResponse({ schema: { example: null } })
  updatePersonalities(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserPersonalitiesUpdateRequestDto,
  ) {
    return this.userService.updatePersonalities(userId ?? 0, body);
  }

  @Put('me/ideal-personalities')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my ideal personalities' })
  @ApiOkResponse({ schema: { example: null } })
  updateIdealPersonalities(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserIdealPersonalitiesUpdateRequestDto,
  ) {
    return this.userService.updateIdealPersonalities(userId ?? 0, body);
  }

  @Get('me/clubs')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '내 동호회 목록' })
  getMyClubs(
    @CurrentUser('userId') userId: number | null,
    @Query('role') role?: 'ALL' | 'HOST' | 'MEMBER',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getMyClubs(userId ?? 0, role ?? 'ALL', cursor, limit ? Number(limit) : 20);
  }

  @Get('me/clubs/liked')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '찜한 동호회 목록' })
  getMyLikedClubs(
    @CurrentUser('userId') userId: number | null,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getMyLikedClubs(userId ?? 0, cursor, limit ? Number(limit) : 20);
  }

  @Post(':userId/visits')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '프로필 조회 마크' })
  markVisit(
    @CurrentUser('userId') me: number | null,
    @Param('userId') userId: string,
  ) {
    return this.userService.markVisit(me ?? 0, Number(userId));
  }

  @Get('me/visitors')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '내 프로필 방문자 목록' })
  getMyVisitors(
    @CurrentUser('userId') me: number | null,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getMyVisitors(me ?? 0, cursor, limit ? Number(limit) : 20);
  }
}
