import { toKstIso } from '../../../common/utils/datetime.util';
import {
  computeNextOccurrenceKst,
  formatDateLabel,
  Recurrence,
} from './recurrence.util';

describe('formatDateLabel', () => {
  it('DAILY: 매일 오후 7시', () => {
    expect(
      formatDateLabel({
        type: 'DAILY',
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 19,
        minute: 0,
      }),
    ).toBe('매일 오후 7시');
  });

  it('WEEKLY THU 19:00 → "매주 목요일 오후 7시"', () => {
    expect(
      formatDateLabel({
        type: 'WEEKLY',
        daysOfWeek: ['THU'],
        dayOfMonth: null,
        hour: 19,
        minute: 0,
      }),
    ).toBe('매주 목요일 오후 7시');
  });

  it('WEEKLY MON/WED/FRI 19:30 → "매주 월/수/금요일 오후 7시 30분"', () => {
    expect(
      formatDateLabel({
        type: 'WEEKLY',
        daysOfWeek: ['WED', 'MON', 'FRI'],
        dayOfMonth: null,
        hour: 19,
        minute: 30,
      }),
    ).toBe('매주 월/수/금요일 오후 7시 30분');
  });

  it('MONTHLY 15 07:00 → "매달 15일 오전 7시"', () => {
    expect(
      formatDateLabel({
        type: 'MONTHLY',
        daysOfWeek: [],
        dayOfMonth: 15,
        hour: 7,
        minute: 0,
      }),
    ).toBe('매달 15일 오전 7시');
  });

  it('자정 12시 처리', () => {
    expect(
      formatDateLabel({
        type: 'DAILY',
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 0,
        minute: 0,
      }),
    ).toBe('매일 오전 12시');
    expect(
      formatDateLabel({
        type: 'DAILY',
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 12,
        minute: 0,
      }),
    ).toBe('매일 오후 12시');
  });
});

describe('computeNextOccurrenceKst', () => {
  const REC_WEEKLY_THU_19: Recurrence = {
    type: 'WEEKLY',
    daysOfWeek: ['THU'],
    dayOfMonth: null,
    hour: 19,
    minute: 0,
  };

  it('WEEKLY THU 19:00, 월요일에 호출하면 같은주 목요일 19:00 KST', () => {
    // 2026-12-07 (월) 09:00 KST = 2026-12-07T00:00:00Z
    const now = new Date('2026-12-07T00:00:00Z');
    const next = computeNextOccurrenceKst(REC_WEEKLY_THU_19, now);
    expect(toKstIso(next)).toBe('2026-12-10T19:00:00+09:00');
  });

  it('WEEKLY THU 19:00, 같은 목요일 18:59에는 오늘 19:00', () => {
    // 2026-12-10 (목) 18:59 KST = 2026-12-10T09:59:00Z
    const now = new Date('2026-12-10T09:59:00Z');
    const next = computeNextOccurrenceKst(REC_WEEKLY_THU_19, now);
    expect(toKstIso(next)).toBe('2026-12-10T19:00:00+09:00');
  });

  it('WEEKLY THU 19:00, 같은 목요일 19:00 정각에는 다음주', () => {
    // 2026-12-10 (목) 19:00 KST = 2026-12-10T10:00:00Z
    const now = new Date('2026-12-10T10:00:00Z');
    const next = computeNextOccurrenceKst(REC_WEEKLY_THU_19, now);
    expect(toKstIso(next)).toBe('2026-12-17T19:00:00+09:00');
  });

  it('DAILY 19:00, 오늘 19:00 이전이면 오늘', () => {
    const now = new Date('2026-12-10T09:59:00Z'); // 18:59 KST
    const next = computeNextOccurrenceKst(
      {
        type: 'DAILY',
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 19,
        minute: 0,
      },
      now,
    );
    expect(toKstIso(next)).toBe('2026-12-10T19:00:00+09:00');
  });

  it('DAILY 자정 직후 → 오늘 시각이 이미 지났으면 내일', () => {
    const now = new Date('2026-12-10T15:01:00Z'); // 00:01 KST 익일
    const next = computeNextOccurrenceKst(
      {
        type: 'DAILY',
        daysOfWeek: [],
        dayOfMonth: null,
        hour: 0,
        minute: 0,
      },
      now,
    );
    // KST 2026-12-11 00:01 시점, 오늘 00:00은 이미 지났으니 2026-12-12 00:00
    expect(toKstIso(next)).toBe('2026-12-12T00:00:00+09:00');
  });

  it('MONTHLY 31일, 2월에는 말일(28/29)로 폴백', () => {
    // 2026-01-31 (토) 23:00 KST 이미 19:00 지남 → 다음 발생은 2026-02-28 19:00
    const now = new Date('2026-01-31T14:00:00Z'); // 23:00 KST
    const next = computeNextOccurrenceKst(
      {
        type: 'MONTHLY',
        daysOfWeek: [],
        dayOfMonth: 31,
        hour: 19,
        minute: 0,
      },
      now,
    );
    expect(toKstIso(next)).toBe('2026-02-28T19:00:00+09:00');
  });

  it('MONTHLY 15일, 이번달 15일 미래면 이번달', () => {
    // 2026-04-10 KST → 다음은 2026-04-15
    const now = new Date('2026-04-10T03:00:00Z'); // 12:00 KST
    const next = computeNextOccurrenceKst(
      {
        type: 'MONTHLY',
        daysOfWeek: [],
        dayOfMonth: 15,
        hour: 19,
        minute: 0,
      },
      now,
    );
    expect(toKstIso(next)).toBe('2026-04-15T19:00:00+09:00');
  });

  it('WEEKLY 여러 요일 중 가장 가까운 요일 선택', () => {
    // 2026-12-10 (목) 20:00 KST → MON/WED/FRI 중 가장 가까운 건 FRI
    const now = new Date('2026-12-10T11:00:00Z');
    const next = computeNextOccurrenceKst(
      {
        type: 'WEEKLY',
        daysOfWeek: ['MON', 'WED', 'FRI'],
        dayOfMonth: null,
        hour: 19,
        minute: 0,
      },
      now,
    );
    expect(toKstIso(next)).toBe('2026-12-11T19:00:00+09:00');
  });
});
