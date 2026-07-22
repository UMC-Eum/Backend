import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserIdealPersonalitiesUpdateRequestDto } from './user-ideal-personalities-update-request.dto';

describe('UserIdealPersonalitiesUpdateRequestDto', () => {
  const validateDto = (payload: Record<string, unknown>) =>
    validate(plainToInstance(UserIdealPersonalitiesUpdateRequestDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('allows optional interest keywords without treating them as unknown fields', async () => {
    const errors = await validateDto({
      personalityKeywords: ['차분함', '신중함'],
      interest: ['영화감상', '문학'],
    });

    expect(errors).toEqual([]);
  });

  it('allows matchedKeywords without personalityKeywords', async () => {
    const errors = await validateDto({
      matchedKeywords: [
        {
          category: 'PERSONALITY',
          id: 1,
          keyword: '차분함',
          score: 0.86,
        },
        {
          category: 'INTEREST',
          id: 13,
          keyword: '요리',
          score: 0.75,
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  it('still rejects unrelated unknown fields', async () => {
    const errors = await validateDto({
      personalityKeywords: ['차분함', '신중함'],
      unknown: ['영화감상'],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('unknown');
  });
});
