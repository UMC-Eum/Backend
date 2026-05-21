import { AppException } from '../errors/app.exception';
import { toPgVectorLiteral } from './pgvector.util';

describe('toPgVectorLiteral', () => {
  it('converts finite numbers to a pgvector literal', () => {
    expect(toPgVectorLiteral([0.12, -0.98, 1])).toBe('[0.12,-0.98,1]');
  });

  it('rejects an empty vector', () => {
    expect(() => toPgVectorLiteral([])).toThrow(AppException);
  });

  it('rejects non-finite numbers', () => {
    expect(() => toPgVectorLiteral([1, Infinity])).toThrow(AppException);
    expect(() => toPgVectorLiteral([1, NaN])).toThrow(AppException);
  });
});
