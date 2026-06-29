export type MessagePreviewType =
  | 'AUDIO'
  | 'PHOTO'
  | 'VIDEO'
  | 'TEXT'
  | 'SYSTEM';

export type MessagePreview = {
  type: MessagePreviewType;
  textPreview: string;
};

export function buildMessagePreview(
  type: string | null,
  text: string | null,
): MessagePreview {
  const t = (type ?? 'TEXT').toUpperCase();

  if (t === 'AUDIO')
    return { type: 'AUDIO', textPreview: '음성메시지를 보냈어요' };
  if (t === 'PHOTO') return { type: 'PHOTO', textPreview: '사진을 보냈어요' };
  if (t === 'VIDEO') return { type: 'VIDEO', textPreview: '동영상을 보냈어요' };

  const raw = (text ?? '').trim();
  const clipped = raw.length > 30 ? `${raw.slice(0, 30)}…` : raw;

  // SYSTEM(입장/퇴장 공지)은 공지 텍스트를 그대로 미리보기로 사용.
  if (t === 'SYSTEM') {
    return { type: 'SYSTEM', textPreview: clipped };
  }

  return { type: 'TEXT', textPreview: clipped || '메시지를 보냈어요' };
}
