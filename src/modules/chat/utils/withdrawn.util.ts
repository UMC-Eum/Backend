import { ActiveStatus } from '@prisma/client';

export const WITHDRAWN_NICKNAME = '탈퇴한 사용자';

/**
 * 탈퇴 사용자 판별.
 * - status === INACTIVE: soft delete된 탈퇴 유저
 * - status == null: participant.userId가 null인 경우(hard delete) → 동일하게 탈퇴 취급
 */
export function isWithdrawn(status: ActiveStatus | null | undefined): boolean {
  return status == null || status === ActiveStatus.INACTIVE;
}

export type NormalizedIdentity = {
  nickname: string;
  profileImageUrl: string | null;
  isWithdrawn: boolean;
};

/**
 * 응답에 내려갈 사용자 신원 필드를 탈퇴 여부에 따라 정규화한다.
 * 탈퇴 사용자면 닉네임을 '탈퇴한 사용자'로, 프로필 이미지는 null로 치환한다.
 */
export function normalizeIdentity(
  status: ActiveStatus | null | undefined,
  nickname: string | null,
  profileImageUrl: string | null,
): NormalizedIdentity {
  const withdrawn = isWithdrawn(status);

  return {
    nickname: withdrawn ? WITHDRAWN_NICKNAME : (nickname ?? WITHDRAWN_NICKNAME),
    profileImageUrl: withdrawn ? null : profileImageUrl,
    isWithdrawn: withdrawn,
  };
}
