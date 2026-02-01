import { Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/errors/app.exception';
import { UserMeResponseDto } from '../../dtos/user-me-response.dto';
import { UserProfileUpdateRequestDto } from '../../dtos/user-profile-update-request.dto';
import { UserInterestsUpdateRequestDto } from '../../dtos/user-interests-update-request.dto';
import { UserPersonalitiesUpdateRequestDto } from '../../dtos/user-personalities-update-request.dto';
import { UserIdealPersonalitiesUpdateRequestDto } from '../../dtos/user-ideal-personalities-update-request.dto';
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
    const personalities = user.personalities
      .map((item) => item.personality.body)
      .filter((body): body is string => Boolean(body));
    const idealPersonalities = user.idealPersonalities
      .map((item) => item.personality.body)
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
      personalities,
      idealPersonalities,
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

    const updateData: {
      nickname?: string;
      sex?: UserMeResponseDto['gender'];
      birthdate?: Date;
      code?: string;
      introText?: string;
      introVoiceUrl?: string;
      profileImageUrl?: string;
    } = {};

    if (payload.nickname !== undefined) {
      updateData.nickname = payload.nickname;
    }

    if (payload.gender !== undefined) {
      updateData.sex = payload.gender;
    }

    if (payload.birthDate !== undefined) {
      updateData.birthdate = new Date(payload.birthDate);
    }

    if (payload.areaCode !== undefined) {
      const address = await this.userRepository.findAddressByCode(
        payload.areaCode,
      );
      if (!address) {
        throw new AppException('VALIDATION_INVALID_FORMAT', {
          message: '유효하지 않은 지역 코드입니다.',
        });
      }
      updateData.code = payload.areaCode;
    }

    if (payload.introText !== undefined) {
      updateData.introText = payload.introText;
    }

    if (payload.introAudioUrl !== undefined) {
      updateData.introVoiceUrl = payload.introAudioUrl;
    }

    if (payload.profileImageUrl !== undefined) {
      updateData.profileImageUrl = payload.profileImageUrl;
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

    if (payload.keywords !== undefined) {
      await this.updateKeywordsByBodies(userId, payload.keywords);
    }

    if (payload.personalities !== undefined) {
      await this.updatePersonalitiesByBodies(userId, payload.personalities);
    }

    if (payload.idealPersonalities !== undefined) {
      await this.updateIdealPersonalitiesByBodies(
        userId,
        payload.idealPersonalities,
      );
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

  async updateInterests(
    userId: number,
    payload: UserInterestsUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updateKeywords(userId, payload.interestIds);

    return null;
  }

  async updatePersonalities(
    userId: number,
    payload: UserPersonalitiesUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updatePersonalities(
      userId,
      payload.personalityIds,
    );

    return null;
  }

  async updateIdealPersonalities(
    userId: number,
    payload: UserIdealPersonalitiesUpdateRequestDto,
  ): Promise<null> {
    if (!userId) {
      throw new AppException('AUTH_LOGIN_REQUIRED');
    }

    await this.userRepository.updateIdealPersonalities(
      userId,
      payload.personalityIds,
    );

    return null;
  }

  private async updateKeywordsByBodies(
    userId: number,
    keywords: string[],
  ): Promise<void> {
    const trimmed = keywords.map((keyword) => keyword.trim()).filter(Boolean);
    const uniqueKeywords = Array.from(new Set(trimmed));

    if (uniqueKeywords.length === 0) {
      await this.userRepository.updateKeywords(userId, []);
      return;
    }

    const interests =
      await this.userRepository.findInterestsByBodies(uniqueKeywords);
    const matched = new Map(
      interests.map((interest) => [interest.body, interest]),
    );
    const missing = uniqueKeywords.filter((keyword) => !matched.has(keyword));

    if (missing.length > 0) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: `유효하지 않은 키워드입니다: ${missing.join(', ')}`,
      });
    }

    const ids = interests.map((interest) => Number(interest.id));
    await this.userRepository.updateKeywords(userId, ids);
  }

  private async updatePersonalitiesByBodies(
    userId: number,
    personalities: string[],
  ): Promise<void> {
    const trimmed = personalities
      .map((personality) => personality.trim())
      .filter(Boolean);
    const uniquePersonalities = Array.from(new Set(trimmed));

    if (uniquePersonalities.length === 0) {
      await this.userRepository.updatePersonalities(userId, []);
      return;
    }

    const entries =
      await this.userRepository.findPersonalitiesByBodies(uniquePersonalities);
    const matched = new Map(entries.map((entry) => [entry.body, entry]));
    const missing = uniquePersonalities.filter(
      (personality) => !matched.has(personality),
    );

    if (missing.length > 0) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: `유효하지 않은 성격입니다: ${missing.join(', ')}`,
      });
    }

    const ids = entries.map((entry) => Number(entry.id));
    await this.userRepository.updatePersonalities(userId, ids);
  }

  private async updateIdealPersonalitiesByBodies(
    userId: number,
    personalities: string[],
  ): Promise<void> {
    const trimmed = personalities
      .map((personality) => personality.trim())
      .filter(Boolean);
    const uniquePersonalities = Array.from(new Set(trimmed));

    if (uniquePersonalities.length === 0) {
      await this.userRepository.updateIdealPersonalities(userId, []);
      return;
    }

    const entries =
      await this.userRepository.findPersonalitiesByBodies(uniquePersonalities);
    const matched = new Map(entries.map((entry) => [entry.body, entry]));
    const missing = uniquePersonalities.filter(
      (personality) => !matched.has(personality),
    );

    if (missing.length > 0) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: `유효하지 않은 이상형 성격입니다: ${missing.join(', ')}`,
      });
    }

    const ids = entries.map((entry) => Number(entry.id));
    await this.userRepository.updateIdealPersonalities(userId, ids);
  }
}
