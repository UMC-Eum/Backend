import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ParsePositiveIntPipe } from '../../../../common/pipes/parse-positive-int.pipe';
import { UserMeResponseDto } from '../../dtos/user-me-response.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
import { UserInterestsUpdateRequestDto } from '../../dtos/user-interests-update-request.dto';
import { UserPersonalitiesUpdateRequestDto } from '../../dtos/user-personalities-update-request.dto';
import {
  UserIdealPersonalitiesUpdateRequestDto,
  UserIdealPersonalitiesUpdateResponseDto,
} from '../../dtos/user-ideal-personalities-update-request.dto';
import {
  UserClubsResponseDto,
  UserLikedClubsResponseDto,
} from '../../dtos/user-clubs-response.dto';
import { UserVisitorsResponseDto } from '../../dtos/user-visitors-response.dto';
import { UserPublicProfileResponseDto } from '../../dtos/user-public-profile-response.dto';
import { ActiveUsersResponseDto } from '../../dtos/user-active-response.dto';
import { DeleteAccountRequestDto } from '../../dtos/delete-account-request.dto';
import { UserService } from '../../services/user/user.service';
import { UserActivityService } from '../../services/user/user-activity.service';
import { ModerateContent } from '../../../../common/moderation/moderate-content.decorator';

@ApiTags('User')
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer access token',
  required: true,
})
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userActivityService: UserActivityService,
  ) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get my profile' })
  @ApiOkResponse({ type: UserMeResponseDto })
  getMe(@CurrentUser('userId') userId: number | null) {
    return this.userService.getMe(userId ?? 0);
  }

  @Get('me/clubs/liked')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get my liked clubs' })
  @ApiOkResponse({ type: UserLikedClubsResponseDto })
  getMyLikedClubs(@CurrentUser('userId') userId: number | null) {
    return this.userService.getMyLikedClubs(userId ?? 0);
  }

  @Get('me/clubs')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get my clubs' })
  @ApiOkResponse({ type: UserClubsResponseDto })
  getMyClubs(@CurrentUser('userId') userId: number | null) {
    return this.userService.getMyClubs(userId ?? 0);
  }

  @Get('me/visitors')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get my profile visitors' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서. 이전 응답의 nextCursor를 전달합니다.',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '한 페이지당 방문자 수',
    example: 20,
  })
  @ApiOkResponse({ type: UserVisitorsResponseDto })
  getMyVisitors(
    @CurrentUser('userId') userId: number | null,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.userService.getMyVisitors(userId ?? 0, { cursor, size });
  }

  @Get('active')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get currently active users in an area',
    description:
      '최근 2분 내 /chats WebSocket 활동이 있었던 같은 시군구 사용자를 조회합니다.',
  })
  @ApiQuery({
    name: 'areaCode',
    required: false,
    description:
      '조회 기준 주소 코드. 생략하면 현재 로그인 사용자의 주소 시군구 기준으로 조회합니다.',
    example: '1168000000',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서. 이전 응답의 nextCursor를 전달합니다.',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '한 페이지당 사용자 수',
    example: 20,
  })
  @ApiOkResponse({ type: ActiveUsersResponseDto })
  getActiveUsers(
    @CurrentUser('userId') userId: number | null,
    @Query('areaCode') areaCode?: string,
    @Query('cursor') cursor?: string,
    @Query('size') size?: string,
  ) {
    return this.userActivityService.getActiveUsers(userId ?? 0, {
      areaCode,
      cursor,
      size,
    });
  }

  @Post(':userId/visits')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Mark profile visit' })
  @ApiOkResponse({ schema: { example: null } })
  @ApiNotFoundResponse({ description: '대상 사용자를 찾을 수 없음' })
  markProfileVisit(
    @CurrentUser('userId') visitorUserId: number | null,
    @Param('userId', new ParsePositiveIntPipe()) visitedUserId: number,
  ) {
    return this.userService.markProfileVisit(visitorUserId ?? 0, visitedUserId);
  }

  @Get(':userId/profile')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get user public profile' })
  @ApiOkResponse({ type: UserPublicProfileResponseDto })
  @ApiNotFoundResponse({ description: '대상 사용자를 찾을 수 없음' })
  getUserProfile(
    @CurrentUser('userId') viewerUserId: number | null,
    @Param('userId', new ParsePositiveIntPipe()) targetUserId: number,
  ) {
    return this.userService.getPublicProfile(viewerUserId ?? 0, targetUserId);
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my profile' })
  @ApiOkResponse({ type: UserMeResponseDto })
  @ModerateContent({
    surface: 'USER_PROFILE',
    textFields: ['nickname', 'introText'],
    imageFields: ['profileImageUrl'],
  })
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

  @Delete('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Delete my account and personal data' })
  @ApiOkResponse({ schema: { example: null } })
  deleteMe(
    @CurrentUser('userId') userId: number | null,
    @CurrentUser('provider') provider: AuthProvider | null,
    @Body() body: DeleteAccountRequestDto,
  ) {
    return this.userService.deleteMe(userId ?? 0, provider, body);
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
  @ApiOkResponse({ type: UserIdealPersonalitiesUpdateResponseDto })
  updateIdealPersonalities(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserIdealPersonalitiesUpdateRequestDto,
  ) {
    return this.userService.updateIdealPersonalities(userId ?? 0, body);
  }
}
