import { Injectable } from '@nestjs/common';

import { AppException } from '../../../../common/errors/app.exception';
import {
  decodeCursor,
  encodeCursor,
} from '../../../../common/utils/cursor.util';
import { buildMessagePreview } from '../../../../common/utils/message-preview.util';

import type {
  CreateRoomRes,
  ListRoomsQueryDto,
  ListRoomsRes,
  RoomDetailRes,
} from '../../dtos/room.dto';
import { MessageRepository } from '../../repositories/message.repository';
import { ParticipantRepository } from '../../repositories/participant.repository';
import { RoomRepository } from '../../repositories/room.repository';

function calcAge(birthdate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) {
    age -= 1;
  }

  return age;
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

    const peerUser = await this.roomRepo.findPeerUserBasic(target);
    if (!peerUser) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '상대 사용자를 찾을 수 없습니다.',
      });
    }

    const existingRoomId = await this.roomRepo.findRoomIdByMeAndTarget(
      me,
      target,
    );
    if (existingRoomId) {
      return {
        chatRoomId: Number(existingRoomId),
        created: false,
        peer: {
          userId: Number(peerUser.id),
          nickname: peerUser.nickname,
          profileImageUrl: peerUser.profileImageUrl ?? null,
        },
      };
    }

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

    const ok = await this.participantRepo.isParticipant(me, roomId);
    if (!ok) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const peer = await this.roomRepo.getPeerDetail(peerUserId);
    if (!peer) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const addr = await this.roomRepo.getAddressByCode(peer.code);
    const areaName =
      addr?.emdName ??
      addr?.sigunguName ??
      addr?.sidoName ??
      addr?.fullName ??
      null;

    return {
      chatRoomId,
      peer: {
        userId: Number(peer.id),
        nickname: peer.nickname,
        age: calcAge(peer.birthdate),
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
    const cursorRoomId = cursor ? BigInt(cursor.roomId) : null;

    const myRoomIds = await this.participantRepo.getMyRoomIds(me);
    if (myRoomIds.length === 0) return { nextCursor: null, items: [] };

    const rooms = await this.roomRepo.getRoomsByIds(myRoomIds);
    if (rooms.length === 0) return { nextCursor: null, items: [] };

    const roomIds = rooms.map((r) => r.id);
    const lastSentAtMap =
      await this.messageRepo.getLastSentAtByRoomIds(roomIds);

    const sorted = rooms
      .map((r) => ({
        roomId: r.id,
        sortAt: lastSentAtMap.get(r.id) ?? r.startedAt,
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
      { userId: number; nickname: string; profileImageUrl: string | null }
    >();

    for (const u of peerUsers) {
      peerMap.set(u.id, {
        userId: Number(u.id),
        nickname: u.nickname,
        profileImageUrl: u.profileImageUrl ?? null,
      });
    }

    const unreadMap = await this.messageRepo.countUnreadByRoomIds(
      pageRoomIds,
      me,
    );

    // never[] 방지: items 타입을 명시
    const items: ListRoomsRes['items'] = [];

    for (const p of page) {
      const peerId = peerIdByRoom.get(p.roomId);
      if (!peerId) continue;

      const peer = peerMap.get(peerId);
      if (!peer) continue;

      const last = await this.messageRepo.getLastMessageSummary(p.roomId);
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
}
