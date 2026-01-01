import { Injectable } from '@nestjs/common';
import { VibeRepository } from '../repositories/vibe.repository';
import { SetUserInterestDto } from '../dtos/set-user-interest.dto';
import { SetUserPersonalityDto } from '../dtos/set-user-personality.dto';
import { SetIdealPersonalityDto } from '../dtos/set-ideal-personality.dto';

@Injectable()
export class VibeService {
  constructor(private readonly vibeRepository: VibeRepository) {}

  setInterests(dto: SetUserInterestDto) {
    return this.vibeRepository.setUserInterests(dto.userId, dto.interestIds);
  }

  setPersonalities(dto: SetUserPersonalityDto) {
    return this.vibeRepository.setUserPersonalities(dto.userId, dto.personalityIds);
  }

  setIdealPersonalities(dto: SetIdealPersonalityDto) {
    return this.vibeRepository.setUserIdealPersonalities(dto.userId, dto.personalityIds);
  }

  listInterests(userId: number) {
    return this.vibeRepository.listInterests(userId);
  }

  listPersonalities(userId: number) {
    return this.vibeRepository.listPersonalities(userId);
  }

  listIdealPersonalities(userId: number) {
    return this.vibeRepository.listIdealPersonalities(userId);
  }
}

