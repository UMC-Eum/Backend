import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { UserMeResponseDto } from '../../dtos/user-me-response.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
import { UserKeywordsUpdateRequestDto } from '../../dtos/user-keyword-update-request.dto';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getMe(userId: number): Promise<UserMeResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const user = await this.userRepository.findProfileById(userId);

    if (!user) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const areaName = user.address.sigunguName ?? user.address.fullName;
    const keywords = user.interests
      .map((interest) => interest.interest.body)
      .filter((body): body is string => Boolean(body));
    const birthDate = user.birthdate.toISOString().split('T')[0];

    return {
      userId: Number(user.id),
      nickname: user.nickname,
      gender: user.sex,
      birthDate,
      area: {
        code: user.address.code,
        name: areaName,
      },
      introText: user.introText,
      keywords,
      introAudioUrl: user.introVoiceUrl,
      profileImageUrl: user.profileImageUrl,
    };
  }

  async updateMe(
    userId: number,
    payload: UserProfileUpdateRequestDto,
  ): Promise<UserMeResponseDto> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const updateData: { nickname?: string; code?: string; introText?: string } =
      {};

    if (payload.nickname !== undefined) {
      updateData.nickname = payload.nickname;
    }

    if (payload.areaCode !== undefined) {
      updateData.code = payload.areaCode;
    }

    if (payload.introText !== undefined) {
      updateData.introText = payload.introText;
    }

    if (Object.keys(updateData).length > 0) {
      const result = await this.userRepository.updateProfile(
        userId,
        updateData,
      );

      if (result.count === 0) {
        throw new AppException('AUTH_LOGIN_REQUIRED');
      }
    }

    return this.getMe(userId);
  }

  async deactivateMe(userId: number): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    const result = await this.userRepository.deactivateProfile(userId);

    if (result.count === 0) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    return null;
  }

  async updateKeywords(
    userId: number,
    payload: UserKeywordsUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updateKeywords(userId, payload.interestKeywordIds);

    return null;
  }
}