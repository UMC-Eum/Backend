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
    console.log('[MATCH] 시작:', { userId: userId.toString(), size });
    const startTime = Date.now();

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

    console.log(
      '[MATCH] 이상형 등록:',
      hasIdealTypes ? '있음' : '없음',
      hasIdealTypes ? `(${idealPersonalityIds.length}개)` : '',
    );

    // 필터링 없이 같은 지역의 모든 활성 사용자 조회
    const whereCondition: any = {
      id: { not: userId },
      status: 'ACTIVE',
      deletedAt: null,
      code: me.code,
    };

    const BATCH_SIZE = Math.min(size * 10, 200);

    console.log('[MATCH] 쿼리 시작 - BATCH_SIZE:', BATCH_SIZE);

    // 1차 하드필터링 없이 같은 지역 모두 조회
    const candidates = await this.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        nickname: true,
        birthdate: true,
        profileImageUrl: true,
        introText: true,
        introVoiceUrl: true,
        vibeVector: true,
        address: {
          select: {
            fullName: true,
          },
        },
        interests: {
          select: {
            interestId: true,
            interest: {
              select: {
                body: true,
              },
            },
          },
        },
        personalities: {
          select: {
            personalityId: true,
            personality: {
              select: {
                body: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
      skip: cursorUserId ? 1 : 0,
      cursor: cursorUserId ? { id: cursorUserId } : undefined,
      take: BATCH_SIZE,
    });

    console.log('[MATCH] 후보 조회 완료:', candidates.length, '명');

    const scored = candidates
      .filter(
        (user): user is (typeof candidates)[0] & { vibeVector: number[] } => {
          if (!Array.isArray(user.vibeVector)) {
            console.log(
              `[MATCH] ❌ vibeVector 필터링 제외 - ID: ${user.id}, type: ${typeof user.vibeVector}`,
            );
            return false;
          }

          if (user.vibeVector.length !== myVector.length) {
            console.log(
              `[MATCH] ❌ vibeVector 길이 불일치 - ID: ${user.id}, ` +
                `expected: ${myVector.length}, got: ${user.vibeVector.length}`,
            );
            return false;
          }

          return true;
        },
      )
      .map((user) => {
        const userVector = user.vibeVector;
        const similarity = this.cosineSimilarityOptimized(myVector, userVector);

        const reasons: string[] = [];

        // 벡터 유사도 스코어
        if (similarity > 0.85) {
          reasons.push('분위기 유사');
        } else if (similarity > 0.7) {
          reasons.push('분위기 어느정도 유사');
        }

        // 공통 관심사 확인
        const userInterestIds = user.interests.map((i) => i.interestId);
        const commonInterests = userInterestIds.filter((id) =>
          myKeywordIds.includes(id),
        );
        if (commonInterests.length > 0) {
          reasons.push(`공통 관심사 ${commonInterests.length}개`);
        }

        // 공통 성향 확인
        const userPersonalityIds = user.personalities.map(
          (p) => p.personalityId,
        );
        const commonPersonalities = userPersonalityIds.filter((id) =>
          myKeywordIds.includes(id),
        );
        if (commonPersonalities.length > 0) {
          reasons.push(`성향 유사 ${commonPersonalities.length}개`);
        }

        // 이상형 유형 매칭 점수
        let idealTypeMatchScore = 0;
        if (hasIdealTypes) {
          const matchedIdealTypes = userPersonalityIds.filter((id) =>
            idealPersonalityIds.includes(id),
          );
          idealTypeMatchScore =
            (matchedIdealTypes.length / idealPersonalityIds.length) * 100;
          if (matchedIdealTypes.length > 0) {
            reasons.push(
              `이상형 ${matchedIdealTypes.length}/${idealPersonalityIds.length} 매칭`,
            );
          }
        }

        const heartId = likedUserMap.get(user.id);

        // 종합 점수 계산
        let totalScore = similarity * 0.4; // 벡터 유사도 40%
        totalScore +=
          (commonInterests.length / Math.max(myKeywordIds.length, 1)) * 0.2; // 관심사 20%
        totalScore +=
          (commonPersonalities.length / Math.max(myKeywordIds.length, 1)) * 0.2; // 성향 20%
        totalScore += (idealTypeMatchScore / 100) * 0.2; // 이상형 매칭 20%

        return {
          userId: user.id.toString(),
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
          matchScore: totalScore,
          matchReasons: reasons.length > 0 ? reasons : ['같은 지역'],
          isLiked: !!heartId,
          likedHeartId: heartId ? heartId.toString() : null,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, size);

    const elapsed = Date.now() - startTime;
    console.log('[MATCH] 완료:', {
      resultCount: scored.length,
      elapsedMs: elapsed,
      isSlow: elapsed > 2000,
    });

    return scored;
  }

  // 벡터 유사도 계산
  private cosineSimilarityOptimized(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i];
      const b = vecB[i];
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
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
