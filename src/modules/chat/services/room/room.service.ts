import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import { decodeCursor, encodeCursor } from '../../utils/cursor.util';
import { buildMessagePreview } from '../../utils/message-preview.util';

import type {
  CreateRoomRes,
  ListRoomsQueryDto,
  ListRoomsRes,
  RoomDetailRes,
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

    // 1) 현재 활성 채팅방이 있으면 그대로 반환
    const activeRoomId = await this.roomRepo.findRoomIdByMeAndTarget(
      me,
      target,
    );
    if (activeRoomId) {
      return {
        chatRoomId: Number(activeRoomId),
        created: false,
        peer: {
          userId: Number(peerUser.id),
          nickname: peerUser.nickname,
          profileImageUrl: peerUser.profileImageUrl ?? null,
        },
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
        peer: {
          userId: Number(peerUser.id),
          nickname: peerUser.nickname,
          profileImageUrl: peerUser.profileImageUrl ?? null,
        },
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
      peer: {
        userId: Number(peerUser.id),
        nickname: peerUser.nickname,
        profileImageUrl: peerUser.profileImageUrl ?? null,
      },
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

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const peer = await this.roomRepo.getPeerDetail(peerUserId);
    if (!peer) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const areaName = pickAreaName(peer.address);

    return {
      chatRoomId,
      joinedAt: myPart.joinedAt.toISOString(),
      peer: {
        userId: Number(peer.id),
        nickname: peer.nickname,
        profileImageUrl: peer.profileImageUrl ?? null,
        age: peer.age,
        areaName,
      },
    };
  }

  async listRooms(
    meUserId: number,
    query: ListRoomsQueryDto,
  ): Promise<ListRoomsRes> {
    const me = BigInt(meUserId);
    const size = query.size ?? 20;

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorSortAt = cursor ? new Date(cursor.sortAt) : null;
    const cursorRoomId =
      cursor && 'roomId' in cursor ? BigInt(cursor.roomId) : null;

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

    const peerIdByRoom = await this.participantRepo.findPeerUserIdsByRoomIds(
      pageRoomIds,
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
      }
    >();

    for (const u of peerUsers) {
      peerMap.set(u.id, {
        userId: Number(u.id),
        nickname: u.nickname,
        profileImageUrl: u.profileImageUrl ?? null,
        areaName: pickAreaName(u.address),
      });
    }

    const unreadMap = await this.messageRepo.countUnreadByRoomIds(
      pageRoomIds,
      me,
    );

    const items: ListRoomsRes['items'] = [];

    for (const p of page) {
      const peerId = peerIdByRoom.get(p.roomId);
      if (!peerId) continue;

      const peer = peerMap.get(peerId);
      if (!peer) continue;

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

      items.push({
        chatRoomId: Number(p.roomId),
        peer,
        lastMessage,
        unreadCount: unreadMap.get(p.roomId) ?? 0,
      });
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

    const left = await this.roomRepo.leaveRoom(roomId, me);
    if (!left) throw new AppException('CHAT_ROOM_ACCESS_FAILED');
  }
}
