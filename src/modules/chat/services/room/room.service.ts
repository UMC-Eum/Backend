import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { ClubRepository } from '../../../club/repositories/club.repository';
import { ChatGateway } from '../../gateways/chat.gateway';
import { decodeRoomCursor, encodeCursor } from '../../utils/cursor.util';
import { buildMessagePreview } from '../../utils/message-preview.util';
import { normalizeIdentity } from '../../utils/withdrawn.util';

import type {
  CreateRoomRes,
  ListRoomsQueryDto,
  ListRoomsRes,
  RoomDetailRes,
  RoomListItem,
} from '../../dtos/room.dto';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

type AddressLike =
  | {
      emdName?: string | null;
      sigunguName?: string | null;
      sidoName?: string | null;
      fullName?: string | null;
    }
  | null
  | undefined;

function pickAreaName(address: AddressLike): string | null {
  return (
    address?.emdName ??
    address?.sigunguName ??
    address?.sidoName ??
    address?.fullName ??
    null
  );
}

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepo: RoomRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly messageRepo: MessageRepository,
    private readonly clubRepo: ClubRepository,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createRoom(
    meUserId: number,
    targetUserId: number,
  ): Promise<CreateRoomRes> {
    if (meUserId === targetUserId) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '자기 자신과는 채팅방을 생성할 수 없습니다.',
      });
    }

    const me = BigInt(meUserId);
    const target = BigInt(targetUserId);

    const isBlocked = await this.participantRepo.isBlockedBetweenUsers(
      me,
      target,
    );
    if (isBlocked) {
      throw new AppException('CHAT_MESSAGE_BLOCKED');
    }

    const peerUser = await this.roomRepo.findPeerUserBasic(target);
    if (!peerUser) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '상대 사용자를 찾을 수 없습니다.',
      });
    }

    const peerIdentity = normalizeIdentity(
      peerUser.status,
      peerUser.nickname,
      peerUser.profileImageUrl ?? null,
    );
    const peer = {
      userId: Number(peerUser.id),
      nickname: peerIdentity.nickname,
      profileImageUrl: peerIdentity.profileImageUrl,
      isWithdrawn: peerIdentity.isWithdrawn,
    };

    // 1) 현재 활성 채팅방이 있으면 그대로 반환
    const activeRoomId = await this.roomRepo.findRoomIdByMeAndTarget(
      me,
      target,
    );
    if (activeRoomId) {
      return {
        chatRoomId: Number(activeRoomId),
        created: false,
        peer,
      };
    }

    // 2) 과거에 종료된 방이 있으면 재활성화 (기록은 남기되, 보여주는 범위는 joinedAt 이후로)
    const latestRoomId = await this.roomRepo.findLatestRoomIdByUsers(
      me,
      target,
    );
    if (latestRoomId) {
      await this.roomRepo.reactivateRoomForUser(latestRoomId, me);
      return {
        chatRoomId: Number(latestRoomId),
        created: false,
        peer,
      };
    }

    // 3) 새 채팅방 생성
    const newRoomId = await this.roomRepo.createRoomWithParticipants(
      me,
      target,
    );

    return {
      chatRoomId: Number(newRoomId),
      created: true,
      peer,
    };
  }

  async getRoomDetail(
    meUserId: number,
    chatRoomId: number,
  ): Promise<RoomDetailRes> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const myPart = await this.participantRepo.getMyActiveParticipation(
      me,
      roomId,
    );
    if (!myPart) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    if (!roomInfo) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    if (roomInfo.type === 'CLUB') {
      return this.getClubRoomDetail(
        chatRoomId,
        roomId,
        roomInfo.clubId,
        myPart.joinedAt,
      );
    }

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const peer = await this.roomRepo.getPeerDetail(peerUserId);
    if (!peer) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const areaName = pickAreaName(peer.address);
    const identity = normalizeIdentity(
      peer.status,
      peer.nickname,
      peer.profileImageUrl ?? null,
    );

    return {
      chatRoomId,
      type: 'DIRECT',
      joinedAt: myPart.joinedAt.toISOString(),
      peer: {
        userId: Number(peer.id),
        nickname: identity.nickname,
        profileImageUrl: identity.profileImageUrl,
        age: peer.age,
        areaName,
        isWithdrawn: identity.isWithdrawn,
      },
    };
  }

  private async getClubRoomDetail(
    chatRoomId: number,
    roomId: bigint,
    clubId: bigint | null,
    joinedAt: Date,
  ): Promise<RoomDetailRes> {
    if (clubId == null) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const club = await this.clubRepo.findClubBasic(clubId);
    if (!club) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const participants =
      await this.participantRepo.getActiveParticipantsWithUser(roomId);

    const members = participants
      // hard delete(userId null)된 참여자는 멤버 목록에서 제외
      .filter((p) => p.userId != null)
      .map((p) => {
        const identity = normalizeIdentity(
          p.status,
          p.nickname,
          p.profileImageUrl,
        );
        return {
          userId: Number(p.userId),
          nickname: identity.nickname,
          profileImageUrl: identity.profileImageUrl,
          role: p.role,
          isWithdrawn: identity.isWithdrawn,
        };
      });

    return {
      chatRoomId,
      type: 'CLUB',
      joinedAt: joinedAt.toISOString(),
      club: {
        clubId: Number(club.id),
        name: club.name,
        thumbnailUrl: club.thumbnailUrl,
      },
      memberCount: members.length,
      members,
    };
  }

  async listRooms(
    meUserId: number,
    query: ListRoomsQueryDto,
  ): Promise<ListRoomsRes> {
    const me = BigInt(meUserId);
    const size = query.size ?? 20;

    const cursor = query.cursor ? decodeRoomCursor(query.cursor) : null;
    const cursorSortAt = cursor ? new Date(cursor.sortAt) : null;
    const cursorRoomId = cursor ? BigInt(cursor.roomId) : null;

    const myRoomIds = await this.participantRepo.getMyRoomIds(me);
    if (myRoomIds.length === 0) return { nextCursor: null, items: [] };

    const rooms = await this.roomRepo.getRoomsByIds(myRoomIds);
    if (rooms.length === 0) return { nextCursor: null, items: [] };

    const roomIds = rooms.map((r) => r.id);

    const joinedAtMap = await this.participantRepo.getMyJoinedAtByRoomIds(
      me,
      roomIds,
    );

    const lastSentAtMap =
      await this.messageRepo.getLastSentAtByRoomIds(roomIds);

    const sorted = rooms
      .map((r) => ({
        roomId: r.id,
        sortAt: (() => {
          const joinedAt = joinedAtMap.get(r.id) ?? r.startedAt;
          const lastSentAt = lastSentAtMap.get(r.id) ?? null;

          if (!lastSentAt) return joinedAt;
          return lastSentAt >= joinedAt ? lastSentAt : joinedAt;
        })(),
      }))
      .filter((x) => {
        if (!cursorSortAt || !cursorRoomId) return true;
        if (x.sortAt < cursorSortAt) return true;
        if (
          x.sortAt.getTime() === cursorSortAt.getTime() &&
          x.roomId < cursorRoomId
        ) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const t = b.sortAt.getTime() - a.sortAt.getTime();
        if (t !== 0) return t;
        return a.roomId < b.roomId ? 1 : -1; // roomId desc
      });

    const pagePlus = sorted.slice(0, size + 1);
    const hasNext = pagePlus.length > size;
    const page = hasNext ? pagePlus.slice(0, size) : pagePlus;

    const pageRoomIds = page.map((x) => x.roomId);

    const roomMetaById = new Map<
      bigint,
      { type: 'DIRECT' | 'CLUB'; clubId: bigint | null }
    >();
    for (const r of rooms) {
      roomMetaById.set(r.id, { type: r.type, clubId: r.clubId });
    }

    const directRoomIds = pageRoomIds.filter(
      (id) => roomMetaById.get(id)?.type === 'DIRECT',
    );
    const clubRoomIds = pageRoomIds.filter(
      (id) => roomMetaById.get(id)?.type === 'CLUB',
    );

    // DIRECT: 상대 정보
    const peerIdByRoom = await this.participantRepo.findPeerUserIdsByRoomIds(
      directRoomIds,
      me,
    );
    const peerIds = Array.from(new Set(Array.from(peerIdByRoom.values())));
    const peerUsers = await this.roomRepo.getPeerBasicsByIds(peerIds);

    const peerMap = new Map<
      bigint,
      {
        userId: number;
        nickname: string;
        profileImageUrl: string | null;
        areaName: string | null;
        isWithdrawn: boolean;
      }
    >();
    for (const u of peerUsers) {
      const identity = normalizeIdentity(
        u.status,
        u.nickname,
        u.profileImageUrl ?? null,
      );
      peerMap.set(u.id, {
        userId: Number(u.id),
        nickname: identity.nickname,
        profileImageUrl: identity.profileImageUrl,
        areaName: pickAreaName(u.address),
        isWithdrawn: identity.isWithdrawn,
      });
    }

    // CLUB: 클럽 정보 + 인원수
    const clubIds = Array.from(
      new Set(
        clubRoomIds
          .map((id) => roomMetaById.get(id)?.clubId ?? null)
          .filter((c): c is bigint => c != null),
      ),
    );
    const clubBriefs = await this.clubRepo.findClubBriefsByIds(clubIds);
    const clubBriefById = new Map(clubBriefs.map((c) => [c.id, c]));
    const memberCountByRoom =
      await this.participantRepo.countActiveByRoomIds(clubRoomIds);

    // unread는 DIRECT/CLUB 공통 커서
    const readStateMap = await this.participantRepo.getMyReadStateByRoomIds(
      me,
      pageRoomIds,
    );
    const unreadMap = await this.messageRepo.countUnreadByCursor(
      pageRoomIds,
      me,
      readStateMap,
    );

    const items: RoomListItem[] = [];

    for (const p of page) {
      const meta = roomMetaById.get(p.roomId);
      if (!meta) continue;

      const joinedAt = joinedAtMap.get(p.roomId) ?? null;
      const last = await this.messageRepo.getLastMessageSummary(
        p.roomId,
        joinedAt,
      );
      const lastMessage = last
        ? {
            ...buildMessagePreview(last.type, last.text),
            sentAt: last.sentAt.toISOString(),
          }
        : null;
      const unreadCount = unreadMap.get(p.roomId) ?? 0;

      if (meta.type === 'CLUB') {
        if (meta.clubId == null) continue;
        const brief = clubBriefById.get(meta.clubId);
        if (!brief) continue;

        items.push({
          chatRoomId: Number(p.roomId),
          type: 'CLUB',
          club: {
            clubId: Number(brief.id),
            name: brief.name,
            thumbnailUrl: brief.thumbnailUrl,
          },
          memberCount: memberCountByRoom.get(p.roomId) ?? 0,
          lastMessage,
          unreadCount,
        });
      } else {
        const peerId = peerIdByRoom.get(p.roomId);
        if (!peerId) continue;
        const peer = peerMap.get(peerId);
        if (!peer) continue;

        items.push({
          chatRoomId: Number(p.roomId),
          type: 'DIRECT',
          peer,
          lastMessage,
          unreadCount,
        });
      }
    }

    const nextCursor = hasNext
      ? encodeCursor({
          sortAt: page[page.length - 1].sortAt.toISOString(),
          roomId: page[page.length - 1].roomId.toString(),
        })
      : null;

    return { nextCursor, items };
  }

  async leaveRoom(meUserId: number, chatRoomId: number): Promise<void> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const ok = await this.participantRepo.isParticipant(me, roomId);
    if (!ok) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    // CLUB이면 퇴장 SYSTEM 메시지용으로 나가기 전에 내 참여자 정보 확보
    const roomInfo = await this.roomRepo.getRoomTypeInfo(roomId);
    const leaver =
      roomInfo?.type === 'CLUB'
        ? await this.participantRepo.getMyParticipantBrief(roomId, me)
        : null;

    const left = await this.roomRepo.leaveRoom(roomId, me);
    if (!left) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    // 퇴장 SYSTEM 메시지 (참여자 row는 endedAt만 세팅돼 남아있어 FK 유효) + 실시간 broadcast
    if (leaver) {
      const text = `${leaver.nickname ?? '알 수 없음'}님이 나갔습니다.`;
      const sys = await this.messageRepo.createSystemMessage(
        leaver.participantId,
        text,
      );
      this.chatGateway.emitChatMessage(chatRoomId, {
        messageId: Number(sys.id),
        chatRoomId,
        senderUserId: meUserId,
        type: 'SYSTEM',
        text,
        mediaUrl: null,
        durationSec: null,
        sentAt: sys.sentAt.toISOString(),
        isSystem: true,
      });
    }
  }
}
