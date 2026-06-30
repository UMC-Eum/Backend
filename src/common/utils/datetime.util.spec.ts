import { toKstIso } from './datetime.util';

describe('toKstIso', () => {
  it('UTC instant를 +09:00 오프셋으로 변환한다', () => {
    expect(toKstIso(new Date('2026-04-20T01:00:00Z'))).toBe(
      '2026-04-20T10:00:00+09:00',
    );
  });

  it('자정 직전 UTC가 KST에서는 다음날 오전이 된다', () => {
    expect(toKstIso(new Date('2026-04-20T15:30:45Z'))).toBe(
      '2026-04-21T00:30:45+09:00',
    );
  });

  it('연말 경계도 정확히 처리한다', () => {
    expect(toKstIso(new Date('2026-12-31T15:00:00Z'))).toBe(
      '2027-01-01T00:00:00+09:00',
    );
  });
});
