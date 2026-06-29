import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

import type { EnterClubRoomRes } from '../../dtos/club-chat.dto';

@Injectable()
export class ClubChatService {
  constructor(
    private readonly clubRepo: ClubRepository,
    private readonly roomRepo: RoomRepository,
    private readonly participantRepo: ParticipantRepository,
  ) {}

  // 클럽 채팅방 입장(lazy provisioning): 방 find-or-create + 내 participant ensure.
  // 멤버십은 ClubUser(ACTIVE)로 인가하고, role은 ClubUser.authority를 그대로 사용한다.
  async enterClubRoom(
    meUserId: number,
    clubId: number,
  ): Promise<EnterClubRoomRes> {
    const me = BigInt(meUserId);
    const clubBigId = BigInt(clubId);

    const club = await this.clubRepo.findClubBasic(clubBigId);
    if (!club || club.deletedAt) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const member = await this.clubRepo.findActiveClubUser(me, clubBigId);
    if (!member) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    const roomId = await this.roomRepo.ensureClubRoom(clubBigId, club.hostId);

    // created=true면 이번에 처음 입장 → 입장 SYSTEM 메시지는 P4에서 처리
    const { created } = await this.participantRepo.ensureClubParticipant(
      roomId,
      me,
      member.authority,
      new Date(),
    );

    const memberCount =
      await this.participantRepo.countActiveParticipants(roomId);

    return {
      chatRoomId: Number(roomId),
      type: 'CLUB',
      created,
      club: {
        clubId: Number(club.id),
        name: club.name,
        thumbnailUrl: club.thumbnailUrl,
      },
      memberCount,
    };
  }
}
