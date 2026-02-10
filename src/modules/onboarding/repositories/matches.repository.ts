import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 이상형 추천 실행
  async findRecommendedMatches(
    userId: bigint,
    size = 20,
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
        sentHearts: {
          where: { status: 'ACTIVE', deletedAt: null },
          select: { sentToId: true, id: true },
        },
      },
    });

    if (!me || !me.vibeVector) {
      throw new Error('사용자 정보가 없거나 vibeVector가 없습니다.');
    }
    if (!Array.isArray(me.vibeVector)) {
      throw new Error('vibeVector 형식이 올바르지 않습니다.');
    }
    if (!me.code) {
      throw new Error('사용자 주소 정보(code)가 없습니다.');
    }

    const myVector = me.vibeVector as number[];
    const myKeywordIds = [
      ...me.interests.map((i) => i.interestId),
      ...me.personalities.map((p) => p.personalityId),
    ];

    // 이미 마음을 누른 사용자 ID 집합
    const likedUserMap = new Map(me.sentHearts.map((h) => [h.sentToId, h.id]));

    // 이상형 등록 여부 확인
    const hasIdealTypes =
      me.idealPersonalities && me.idealPersonalities.length > 0;
    const idealPersonalityIds = me.idealPersonalities.map(
      (ip) => ip.personalityId,
    );

    console.log('='.repeat(60));
    console.log('[MATCH DEBUG] 현재 유저 정보:');
    console.log('  userId:', userId.toString());
    console.log('  code (지역):', me.code);
    console.log('  vibeVector 길이:', myVector.length);
    console.log('  내 관심사 키워드 ID:', myKeywordIds);
    console.log(
      '  내 성향 ID:',
      me.personalities.map((p) => p.personalityId),
    );
    console.log('  이상형 등록 여부:', hasIdealTypes);
    console.log('  이상형 성향 ID:', idealPersonalityIds);
    console.log('='.repeat(60));

    // 이상형 여부에 따라 조건을 다르게 설정
    const whereCondition: Record<string, unknown> = {
      id: { not: userId },
      status: 'ACTIVE',
      deletedAt: null,
      code: me.code,
    };

    // 이상형이 등록된 경우: 추가 조건 적용
    if (hasIdealTypes && idealPersonalityIds.length > 0) {
      // 이상형 성향을 가진 유저들만 필터링
      whereCondition.personalities = {
        some: {
          personalityId: { in: idealPersonalityIds },
        },
      };
      console.log(
        '[MATCH] 이상형 필터링 활성화 - 성향 ID:',
        idealPersonalityIds,
      );
    } else {
      console.log('[MATCH] 이상형 미등록 - 같은 지역 모두 추천');
    }

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
      take: size + 1, // 다음 cursor 확인용
    });

    console.log(`[MATCH] WHERE 필터 후보: ${candidates.length}명`);
    console.log('[MATCH] 후보자 목록:');
    candidates.forEach((c) => {
      console.log(
        `  - ID: ${c.id}, 닉네임: ${c.nickname}, 성향: ${c.personalities.map((p) => p.personalityId).join(',')}`,
      );
    });

    // 벡터값 기반 소프트매치
    const scored = candidates
      .filter((user) => {
        const userVector = user.vibeVector as number[];
        const isValid =
          Array.isArray(userVector) && userVector.length === myVector.length;

        if (!isValid) {
          console.log(
            `[MATCH] 벡터 필터링 제외 - ID: ${user.id}, ` +
              `hasVector: ${!!user.vibeVector}, ` +
              `length: ${(userVector as any)?.length} (필요: ${myVector.length})`,
          );
        }
        return isValid;
      })
      .map((user) => {
        const userVector = user.vibeVector as number[];
        const similarity = this.cosineSimilarity(myVector, userVector);

        const reasons: string[] = [];

        // 분위기 유사도
        if (similarity > 0.85) {
          reasons.push('분위기 유사');
        } else if (similarity > 0.7) {
          reasons.push('분위기 어느정도 유사');
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

        // 이상형 조건 매칭 (이상형이 등록된 경우만)
        let matchesIdealType = false;
        if (hasIdealTypes) {
          matchesIdealType = userPersonalityIds.some((id) =>
            idealPersonalityIds.includes(id),
          );
          if (matchesIdealType) {
            reasons.push('이상형 유형 매칭');
          }
        }

        const heartId = likedUserMap.get(user.id);

        console.log(
          `[MATCH] 채점 완료 - ID: ${user.id}, ` +
            `유사도: ${similarity.toFixed(3)}, ` +
            `이유: ${reasons.join(', ')}`,
        );

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
          isLiked: !!heartId,
          likedHeartId: heartId || null,
        };
      })
      .sort((a, b) => {
        // 벡터 유사도로 정렬
        return b.matchScore - a.matchScore;
      })
      .slice(0, size);

    console.log(`[MATCH] 최종 결과: ${scored.length}명 (요청: ${size}명)`);
    console.log('='.repeat(60));

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
