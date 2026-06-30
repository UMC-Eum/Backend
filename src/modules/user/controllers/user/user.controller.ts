import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { UserIdealPersonalitiesUpdateRequestDto } from '../../dtos/user-ideal-personalities-update-request.dto';
import {
  UserClubsResponseDto,
  UserLikedClubsResponseDto,
} from '../../dtos/user-clubs-response.dto';
import { UserVisitorsResponseDto } from '../../dtos/user-visitors-response.dto';
import { UserPublicProfileResponseDto } from '../../dtos/user-public-profile-response.dto';
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
}
