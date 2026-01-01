import { Controller, Get, Param } from '@nestjs/common';
import { ProfileService } from '../services/profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':userId')
  getProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(Number(userId));
  }
}

