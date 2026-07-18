import { DayOfWeek, RecurrenceType } from '@prisma/client';

const KST_OFFSET_MS = 9 * 60 * 60_000;

const DAY_OF_WEEK_LABEL: Record<DayOfWeek, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
};

const DAY_OF_WEEK_ORDER: Record<DayOfWeek, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 0,
};

export type Recurrence = {
  type: RecurrenceType;
  daysOfWeek: DayOfWeek[];
  dayOfMonth: number | null;
  hour: number;
  minute: number;
};

function formatTimeOfDay(hour: number, minute: number): string {
  const meridiem = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  if (minute === 0) {
    return `${meridiem} ${displayHour}시`;
  }
  return `${meridiem} ${displayHour}시 ${minute}분`;
}

function sortedDaysOfWeek(days: DayOfWeek[]): DayOfWeek[] {
  const order: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function formatDateLabel(rec: Recurrence): string {
  const time = formatTimeOfDay(rec.hour, rec.minute);
  switch (rec.type) {
    case 'DAILY':
      return `매일 ${time}`;
    case 'WEEKLY': {
      const labels = sortedDaysOfWeek(rec.daysOfWeek).map(
        (d) => DAY_OF_WEEK_LABEL[d],
      );
      return `매주 ${labels.join('/')}요일 ${time}`;
    }
    case 'MONTHLY':
      return `매달 ${rec.dayOfMonth}일 ${time}`;
  }
}

function toKstParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

function kstToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - KST_OFFSET_MS);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function isStrictlyAfter(
  a: { day: number; hour: number; minute: number },
  b: { day: number; hour: number; minute: number },
): boolean {
  if (a.day !== b.day) return a.day > b.day;
  if (a.hour !== b.hour) return a.hour > b.hour;
  return a.minute > b.minute;
}

export function computeNextOccurrenceKst(rec: Recurrence, now: Date): Date {
  const k = toKstParts(now);

  if (rec.type === 'DAILY') {
    const todayCandidate = { day: k.day, hour: rec.hour, minute: rec.minute };
    const fromNow = { day: k.day, hour: k.hour, minute: k.minute };
    if (isStrictlyAfter(todayCandidate, fromNow)) {
      return kstToUtc(k.year, k.month, k.day, rec.hour, rec.minute);
    }
    return kstToUtc(k.year, k.month, k.day + 1, rec.hour, rec.minute);
  }

  if (rec.type === 'WEEKLY') {
    const targetWeekdays = rec.daysOfWeek.map((d) => DAY_OF_WEEK_ORDER[d]);
    let bestOffset: number | null = null;
    for (const target of targetWeekdays) {
      let offset = (target - k.dayOfWeek + 7) % 7;
      if (
        offset === 0 &&
        !isStrictlyAfter(
          { day: 0, hour: rec.hour, minute: rec.minute },
          { day: 0, hour: k.hour, minute: k.minute },
        )
      ) {
        offset = 7;
      }
      if (bestOffset === null || offset < bestOffset) {
        bestOffset = offset;
      }
    }
    return kstToUtc(
      k.year,
      k.month,
      k.day + (bestOffset ?? 0),
      rec.hour,
      rec.minute,
    );
  }

  // MONTHLY
  const dayOfMonth = rec.dayOfMonth ?? 1;
  for (let monthsAhead = 0; monthsAhead < 13; monthsAhead++) {
    const targetMonth = k.month + monthsAhead;
    const targetYear = k.year + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = lastDayOfMonth(targetYear, normalizedMonth);
    const effectiveDay = Math.min(dayOfMonth, lastDay);
    if (monthsAhead === 0) {
      const candidate = {
        day: effectiveDay,
        hour: rec.hour,
        minute: rec.minute,
      };
      const fromNow = { day: k.day, hour: k.hour, minute: k.minute };
      if (isStrictlyAfter(candidate, fromNow)) {
        return kstToUtc(
          targetYear,
          normalizedMonth,
          effectiveDay,
          rec.hour,
          rec.minute,
        );
      }
      continue;
    }
    return kstToUtc(
      targetYear,
      normalizedMonth,
      effectiveDay,
      rec.hour,
      rec.minute,
    );
  }
  // 도달 불가 (1년 이내 반드시 다음 발생 존재)
  return kstToUtc(k.year + 1, k.month, dayOfMonth, rec.hour, rec.minute);
}
