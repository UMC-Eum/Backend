import type { ClubDetailResponseDto, ClubListItemDto } from '../dtos/club.dto';
import type {
  ClubDetailRow,
  ClubListRow,
} from '../repositories/club.repository.types';
import { ActiveStatus, ClubAuthority, DayOfWeek } from '@prisma/client';

export function toClubListItemDto(row: ClubListRow): ClubListItemDto {
  return {
    clubId: row.id.toString(),
    name: row.name,
    introText: row.introText,
    category: row.category,
    thumbnailUrl: row.thumbnailUrl,
    likes: row.likes,
    memberCount: row._count.clubUsers,
    createdAt: row.createdAt.toISOString(),
  };
}

type ClubDetailFlags = {
  isLiked: boolean;
  isJoined: boolean;
  myAuthority: ClubAuthority | null;
};

const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function firstWeeklyDay(daysOfWeek: DayOfWeek[]): DayOfWeek | null {
  return (
    [...daysOfWeek].sort(
      (a, b) => DAY_OF_WEEK_ORDER.indexOf(a) - DAY_OF_WEEK_ORDER.indexOf(b),
    )[0] ?? null
  );
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
    meetings: row.meetings.map((meeting) => {
      return {
        meetingId: meeting.id.toString(),
        name: meeting.name,
        day:
          meeting.recurrenceType === 'WEEKLY'
            ? firstWeeklyDay(meeting.daysOfWeek)
            : null,
        time: `${pad2(meeting.hour)}:${pad2(meeting.minute)}:00`,
      };
    }),
    createdAt: row.createdAt.toISOString(),
  };
}
