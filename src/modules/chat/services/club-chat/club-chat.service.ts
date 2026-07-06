import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ChatGateway } from '../../gateways/chat.gateway';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

import type { EnterClubRoomRes } from '../../dtos/club-chat.dto';

@Injectable()
export class ClubChatService {
  constructor(
    private readonly clubRepo: ClubRepository,
    private readonly roomRepo: RoomRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly messageRepo: MessageRepository,
    private readonly chatGateway: ChatGateway,
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
    if (!club) {
      throw new AppException('CLUB_NOT_FOUND');
    }

    const member = await this.clubRepo.findActiveClubUser(me, clubBigId);
    if (!member) {
      throw new AppException('CLUB_FORBIDDEN_NOT_MEMBER');
    }

    const roomId = await this.roomRepo.ensureClubRoom(clubBigId, club.hostId);

    const { participantId, created, nickname } =
      await this.participantRepo.ensureClubParticipant(
        roomId,
        me,
        member.authority,
        new Date(),
      );

    // 이번에 처음 입장한 경우에만 "{닉네임}님이 입장했습니다." SYSTEM 메시지 영속 + 실시간 broadcast
    if (created) {
      const text = `${nickname ?? '알 수 없음'}님이 입장했습니다.`;
      const sys = await this.messageRepo.createSystemMessage(
        participantId,
        text,
      );
      this.chatGateway.emitChatMessage(Number(roomId), {
        messageId: Number(sys.id),
        chatRoomId: Number(roomId),
        senderUserId: meUserId,
        type: 'SYSTEM',
        text,
        mediaUrl: null,
        durationSec: null,
        sentAt: sys.sentAt.toISOString(),
        isSystem: true,
      });
    }

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
