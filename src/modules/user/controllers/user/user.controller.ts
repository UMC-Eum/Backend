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
import { UserKeywordsUpdateRequestDto } from '../../dtos/user-keywords-update-request.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
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

  @Put('me/keywords')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update my keywords' })
  @ApiOkResponse({ schema: { example: null } })
  updateKeywords(
    @CurrentUser('userId') userId: number | null,
    @Body() body: UserKeywordsUpdateRequestDto,
  ) {
    return this.userService.updateKeywords(userId ?? 0, body);
  }
}
