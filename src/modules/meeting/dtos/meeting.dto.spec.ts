import { DayOfWeek, RecurrenceType } from '@prisma/client';
import { RecurrenceShapeConstraint } from './meeting.dto';

describe('RecurrenceShapeConstraint', () => {
  const c = new RecurrenceShapeConstraint();

  it('WEEKLY + daysOfWeek 만 → 통과', () => {
    expect(
      c.validate({
        type: RecurrenceType.WEEKLY,
        daysOfWeek: [DayOfWeek.THU],
        hour: 19,
        minute: 0,
      }),
    ).toBe(true);
  });

  it('WEEKLY + dayOfMonth 동시에 → 거절', () => {
    expect(
      c.validate({
        type: RecurrenceType.WEEKLY,
        daysOfWeek: [DayOfWeek.THU],
        dayOfMonth: 15,
        hour: 19,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('MONTHLY + dayOfMonth 만 → 통과', () => {
    expect(
      c.validate({
        type: RecurrenceType.MONTHLY,
        dayOfMonth: 15,
        hour: 19,
        minute: 0,
      }),
    ).toBe(true);
  });

  it('MONTHLY + daysOfWeek 동시에 → 거절', () => {
    expect(
      c.validate({
        type: RecurrenceType.MONTHLY,
        dayOfMonth: 15,
        daysOfWeek: [DayOfWeek.THU],
        hour: 19,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('DAILY + 부수 필드 없음 → 통과', () => {
    expect(c.validate({ type: RecurrenceType.DAILY, hour: 7, minute: 0 })).toBe(
      true,
    );
  });

  it('DAILY + daysOfWeek → 거절', () => {
    expect(
      c.validate({
        type: RecurrenceType.DAILY,
        daysOfWeek: [DayOfWeek.MON],
        hour: 7,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('DAILY + dayOfMonth → 거절', () => {
    expect(
      c.validate({
        type: RecurrenceType.DAILY,
        dayOfMonth: 1,
        hour: 7,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('DAILY + 빈 daysOfWeek 배열 → 거절 (존재 여부 기준)', () => {
    expect(
      c.validate({
        type: RecurrenceType.DAILY,
        daysOfWeek: [],
        hour: 7,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('DAILY + scalar daysOfWeek(예: "MON") → 거절', () => {
    expect(
      c.validate({
        type: RecurrenceType.DAILY,
        daysOfWeek: 'MON' as unknown as DayOfWeek[],
        hour: 7,
        minute: 0,
      }),
    ).toBe(false);
  });

  it('DAILY + daysOfWeek=null → 통과 (null=명시적 부재)', () => {
    expect(
      c.validate({
        type: RecurrenceType.DAILY,
        daysOfWeek: null as unknown as DayOfWeek[],
        hour: 7,
        minute: 0,
      }),
    ).toBe(true);
  });

  it('잘못된 input(null) → 다른 검증기에 위임 (true)', () => {
    expect(c.validate(null)).toBe(true);
    expect(c.validate(undefined)).toBe(true);
  });

  it('defaultMessage: WEEKLY가 아닌데 daysOfWeek 있음', () => {
    const msg = c.defaultMessage({
      value: {
        type: RecurrenceType.MONTHLY,
        daysOfWeek: [DayOfWeek.THU],
        dayOfMonth: 15,
        hour: 19,
        minute: 0,
      },
    } as never);
    expect(msg).toContain('daysOfWeek');
  });

  it('defaultMessage: MONTHLY가 아닌데 dayOfMonth 있음', () => {
    const msg = c.defaultMessage({
      value: {
        type: RecurrenceType.WEEKLY,
        daysOfWeek: [DayOfWeek.THU],
        dayOfMonth: 15,
        hour: 19,
        minute: 0,
      },
    } as never);
    expect(msg).toContain('dayOfMonth');
  });
});
