export type ClubBrief = {
  clubId: number;
  name: string;
  thumbnailUrl: string | null;
};

export type EnterClubRoomRes = {
  chatRoomId: number;
  type: 'CLUB';
  created: boolean; // 이번 호출로 채팅방에 처음 입장했는지 (입장 SYSTEM 메시지 대상)
  club: ClubBrief;
  memberCount: number; // 활성 ChatParticipant 수
};
