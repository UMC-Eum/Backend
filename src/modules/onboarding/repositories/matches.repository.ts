import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 이상형 추천 실행
  async findRecommendedMatches(
    userId: bigint,
    size = 20,
    ageMin?: number,
    ageMax?: number,
    cursorUserId?: bigint | null,
  ) {
    // 현재 유저 정보
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        interests: { select: { interestId: true } },
        personalities: { select: { personalityId: true } },
        idealPersonalities: { select: { personalityId: true } },
      },
    });

    if (!me || !me.vibeVector) {
      throw new Error('사용자 정보가 없거나 vibeVector가 없습니다.');
    }

    const myVector = me.vibeVector as number[];
    const myKeywordIds = [
      ...me.interests.map((i) => i.interestId),
      ...me.personalities.map((p) => p.personalityId),
    ];

    // 이상형 등록 여부 확인
    const hasIdealTypes =
      me.idealPersonalities && me.idealPersonalities.length > 0;
    const idealPersonalityIds = me.idealPersonalities.map(
      (ip) => ip.personalityId,
    );

    // 필터링 조건 구성
    const whereCondition: any = {
      id: { not: userId },
      status: 'ACTIVE',
      deletedAt: null,
      // 1단계: 주소 기반 필터링
      address: {
        parentCode: me.address?.parentCode, // 같은 시군구 기준
      },
      birthdate: {
        gte: ageMax
          ? new Date(`${new Date().getFullYear() - ageMax}-01-01`)
          : undefined,
        lte: ageMin
          ? new Date(`${new Date().getFullYear() - ageMin}-12-31`)
          : undefined,
      },
    };

    // 2단계: 이상형 등록 여부에 따른 추가 필터링
    if (hasIdealTypes) {
      // 이상형이 등록된 경우: 관심사/성향 또는 이상형 조건
      whereCondition.OR = [
        {
          interests: {
            some: {
              interestId: { in: myKeywordIds },
            },
          },
        },
        {
          personalities: {
            some: {
              personalityId: { in: myKeywordIds },
            },
          },
        },
        {
          personalities: {
            some: {
              personalityId: { in: idealPersonalityIds },
            },
          },
        },
      ];
    }
    // 이상형 미등록: 같은 지역 유저만 추천

    // 1차 하드필터링으로 후보 조회
    const candidates = await this.prisma.user.findMany({
      where: whereCondition,
      include: {
        address: true,
        interests: { include: { interest: true } },
        personalities: { include: { personality: true } },
      },
      orderBy: { id: 'asc' }, 
      skip: cursorUserId ? 1 : 0, 
      cursor: cursorUserId ? { id: cursorUserId } : undefined, 
      take: 100,
    });

    // 벡터값 기반 소프트매치 + 가공
    const scored = candidates
      .filter((user) => {
        const userVector = user.vibeVector as number[];
        return (
          Array.isArray(userVector) && userVector.length === myVector.length
        );
      })
      .map((user) => {
        const userVector = user.vibeVector as number[];
        const similarity = this.cosineSimilarity(myVector, userVector);

        const reasons: string[] = [];

        if (similarity > 0.85) {
          reasons.push('분위기 유사');
        }

        // 공통 관심사 존재
        const userInterestIds = user.interests.map((i) => i.interestId);
        const hasCommonInterest = userInterestIds.some((id) =>
          myKeywordIds.includes(id),
        );
        if (hasCommonInterest) {
          reasons.push('공통 관심사 존재');
        }

        // 공통 성향 존재
        const userPersonalityIds = user.personalities.map(
          (p) => p.personalityId,
        );
        const hasCommonPersonality = userPersonalityIds.some((id) =>
          myKeywordIds.includes(id),
        );
        if (hasCommonPersonality) {
          reasons.push('성향 유사');
        }

        // 이상형 조건 매칭 (이상형 등록된 경우만)
        if (hasIdealTypes) {
          const matchesIdealType = userPersonalityIds.some((id) =>
            idealPersonalityIds.includes(id),
          );
          if (matchesIdealType) {
            reasons.push('이상형 유형 매칭');
          }
        }

        return {
          userId: user.id,
          nickname: user.nickname,
          age: this.calculateAge(user.birthdate),
          areaName: user.address?.fullName ?? '',
          keywords: [
            ...user.interests.map((i) => i.interest.body),
            ...user.personalities.map((p) => p.personality.body),
          ],
          introText: user.introText,
          introAudioUrl: user.introVoiceUrl,
          profileImageUrl: user.profileImageUrl,
          matchScore: similarity,
          matchReasons: reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, size);

    return scored;
  }

  // 코사인 유사도 계산 함수
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  // 생일 기반 만 나이 계산 함수
  private calculateAge(birthdate: Date): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}