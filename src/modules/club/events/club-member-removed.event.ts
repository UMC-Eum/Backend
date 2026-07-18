// 클럽 탈퇴/강퇴로 멤버가 제거됐음을 알리는 도메인 이벤트.
// club 도메인은 이 사실만 발행하고, chat 도메인이 구독해 실시간 소켓 룸에서 퇴출한다.
// (ChatModule → ClubModule 의존이라 club→chat 직접 주입은 순환참조 → 이벤트로 의존성 역전)
export const CLUB_MEMBER_REMOVED = 'club.member.removed';

export class ClubMemberRemovedEvent {
  constructor(
    readonly clubId: bigint,
    readonly userId: bigint,
  ) {}
}
