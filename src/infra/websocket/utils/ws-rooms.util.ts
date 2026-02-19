export function toUserRoom(userId: number): string {
  return `user:${userId}`;
}

export function toChatRoom(chatRoomId: number): string {
  return `room:${chatRoomId}`;
}
