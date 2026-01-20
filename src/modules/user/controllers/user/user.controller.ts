import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
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
}
