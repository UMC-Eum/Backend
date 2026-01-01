import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VibeService } from '../services/vibe.service';
import { SetUserInterestDto } from '../dtos/set-user-interest.dto';
import { SetUserPersonalityDto } from '../dtos/set-user-personality.dto';
import { SetIdealPersonalityDto } from '../dtos/set-ideal-personality.dto';

@Controller('profile/vibe')
export class VibeController {
  constructor(private readonly vibeService: VibeService) {}

  @Post('interests')
  setInterests(@Body() dto: SetUserInterestDto) {
    return this.vibeService.setInterests(dto);
  }

  @Post('personalities')
  setPersonalities(@Body() dto: SetUserPersonalityDto) {
    return this.vibeService.setPersonalities(dto);
  }

  @Post('ideal-personalities')
  setIdealPersonalities(@Body() dto: SetIdealPersonalityDto) {
    return this.vibeService.setIdealPersonalities(dto);
  }

  @Get(':userId/interests')
  listInterests(@Param('userId') userId: string) {
    return this.vibeService.listInterests(Number(userId));
  }

  @Get(':userId/personalities')
  listPersonalities(@Param('userId') userId: string) {
    return this.vibeService.listPersonalities(Number(userId));
  }

  @Get(':userId/ideal-personalities')
  listIdealPersonalities(@Param('userId') userId: string) {
    return this.vibeService.listIdealPersonalities(Number(userId));
  }
}

