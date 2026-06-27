import type { ClubDetailResponseDto, ClubListItemDto } from '../dtos/club.dto';
import type {
  ClubDetailRow,
  ClubListRow,
} from '../repositories/club.repository.types';
import { ActiveStatus, ClubAuthority } from '@prisma/client';

export function toClubListItemDto(row: ClubListRow): ClubListItemDto {
  return {
    clubId: row.id.toString(),
    name: row.name,
    introText: row.introText,
    category: row.category,
    thumbnailUrl: row.thumbnailUrl,
    likes: row.likes,
    memberCount: row._count.clubUsers,
    keywords: row.clubKeywords.map((keyword) => keyword.personality.body),
    createdAt: row.createdAt.toISOString(),
  };
}

type ClubDetailFlags = {
  isLiked: boolean;
  isJoined: boolean;
  myAuthority: ClubAuthority | null;
};

const DAY_REGEX = /^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(\d{2}:\d{2}(?::\d{2})?)$/i;
const KOREAN_DAY_REGEX =
  /([월화수목금토일])요일?.*?(\d{1,2})시(?:\s*(\d{1,2})분)?/;

const KOREAN_DAY_TO_EN: Record<string, string> = {
  월: 'MON',
  화: 'TUE',
  수: 'WED',
  목: 'THU',
  금: 'FRI',
  토: 'SAT',
  일: 'SUN',
};

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function parseMeetingSchedule(
  date: string,
): { day: string; time: string } | null {
  const englishMatch = date.match(DAY_REGEX);
  if (englishMatch) {
    const day = englishMatch[1].toUpperCase();
    const rawTime = englishMatch[2];
    const time = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
    return { day, time };
  }

  const koreanMatch = date.match(KOREAN_DAY_REGEX);
  if (!koreanMatch) {
    return null;
  }

  const day = KOREAN_DAY_TO_EN[koreanMatch[1]];
  if (!day) {
    return null;
  }

  const rawHour = Number(koreanMatch[2]);
  const rawMinute = Number(koreanMatch[3] ?? 0);
  if (!Number.isInteger(rawHour) || rawHour < 0 || rawHour > 23) {
    return null;
  }
  if (!Number.isInteger(rawMinute) || rawMinute < 0 || rawMinute > 59) {
    return null;
  }

  const isPm = /오후|저녁|밤|PM/i.test(date);
  const isAm = /오전|AM/i.test(date);

  let hour = rawHour;
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  return {
    day,
    time: `${pad2(hour)}:${pad2(rawMinute)}:00`,
  };
}

export function toClubDetailDto(
  row: ClubDetailRow,
  flags: ClubDetailFlags,
): ClubDetailResponseDto {
  const host =
    row.user &&
    row.user.deletedAt === null &&
    row.user.status === ActiveStatus.ACTIVE
      ? {
          userId: row.user.id.toString(),
          nickname: row.user.nickname,
          profileImageUrl: row.user.profileImageUrl ?? null,
        }
      : null;

  return {
    clubId: row.id.toString(),
    name: row.name,
    category: row.category,
    introVoice: row.introVoiceUrl,
    introText: row.introText,
    capacity: row.capacity,
    memberCount: row._count.clubUsers,
    likes: row.likes,
    isLiked: flags.isLiked,
    isJoined: flags.isJoined,
    myAuthority: flags.myAuthority,
    host,
    keywords: row.clubKeywords
      .map((keyword) => keyword.personality.body)
      .filter((body): body is string => Boolean(body)),
    meetings: row.meetings.map((meeting) => {
      const schedule = parseMeetingSchedule(meeting.date);
      return {
        meetingId: meeting.id.toString(),
        name: meeting.name,
        day: schedule?.day ?? null,
        time: schedule?.time ?? null,
      };
    }),
    createdAt: row.createdAt.toISOString(),
  };
}
