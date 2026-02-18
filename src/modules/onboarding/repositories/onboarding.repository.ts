import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { CreateProfileDto } from '../dtos/onboarding.dto';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 생일 기반 만 나이 계산 함수
  private calculateAge(birthdate: Date): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  async updateUserProfile(
    userId: number,
    dto: CreateProfileDto,
  ): Promise<void> {
    const {
      nickname,
      gender,
      birthDate,
      areaCode,
      introText,
      introAudioUrl,
      selectedKeywords,
      vibeVector,
    } = dto;

    const birthDateObj = new Date(birthDate);
    const age = this.calculateAge(birthDateObj);

    // 유저 정보 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname,
        sex: gender === 'F' ? 'F' : 'M',
        birthdate: new Date(birthDate),
        code: areaCode,
        introText,
        introVoiceUrl: introAudioUrl,
        vibeVector,
        age,
      },
    });

    // 키워드 후보들 중 DB에 존재하는 ID 조회
    const matchedInterests = await this.prisma.interest.findMany({
      where: { body: { in: selectedKeywords } },
      select: { id: true, body: true },
    });

    const matchedPersonalities = await this.prisma.personality.findMany({
      where: { body: { in: selectedKeywords } },
      select: { id: true, body: true },
    });

    console.log(
      `[ONBOARDING] matchedInterests=${matchedInterests.length}개, matchedPersonalities=${matchedPersonalities.length}개`,
    );

    // 기존 키워드 삭제 + 새 키워드 저장
    await this.prisma.$transaction(async (tx) => {
      // 기존 관심사 삭제
      await tx.userInterest.deleteMany({
        where: { userId },
      });

      // 기존 성향 삭제
      await tx.userPersonality.deleteMany({
        where: { userId },
      });

      // 새로운 관심사 저장
      if (matchedInterests.length > 0) {
        await tx.userInterest.createMany({
          data: matchedInterests.map(({ id }) => ({
            interestId: id,
            userId,
          })),
        });
      }

      // 새로운 성향 저장
      if (matchedPersonalities.length > 0) {
        await tx.userPersonality.createMany({
          data: matchedPersonalities.map(({ id }) => ({
            personalityId: id,
            userId,
          })),
        });
      }
    });
  }
}
