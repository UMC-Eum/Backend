import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { CreateProfileDto } from '../dtos/onboarding.dto';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserProfile(userId: number, dto: CreateProfileDto): Promise<void> {
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

    // 유저 정보 업데이트 
    await this.prisma.user.update({
        where: {id:userId},
        data: {
            nickname,
            sex: gender === 'F' ? 'F' : 'M',
            birthdate: new Date(birthDate),
            code: areaCode,
            introText,
            introVoiceUrl: introAudioUrl,
            vibeVector,
        }
    })

    // 키워드 후보들 중 DB에 존재하는 ID 조회 
    const matchedInterests = await this.prisma.interest.findMany({
      where: { body: { in: selectedKeywords } },
      select: { id: true, body: true },
    });

    const matchedPersonalities = await this.prisma.personality.findMany({
      where: { body: { in: selectedKeywords } },
      select: { id: true, body: true },
    });

    // 중복 저장 방지 
    await this.prisma.$transaction([
      ...matchedInterests.map(({ id }) =>
        this.prisma.userInterest.upsert({
          where: {
            interestId_userId: {
              interestId: id,
              userId,
            },
          },
          update: {},
          create: {
            interestId: id,
            userId,
            vibeVector,
          },
        }),
      ),
      ...matchedPersonalities.map(({ id }) =>
        this.prisma.userPersonality.upsert({
          where: {
            userId_personalityId: {
              personalityId: id,
              userId,
            },
          },
          update: {},
          create: {
            personalityId: id,
            userId,
          },
        }),
      ),
    ]);
  }
}