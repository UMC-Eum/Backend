import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SendMessageDto } from './message.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(SendMessageDto, payload);
  return validate(dto);
}

describe('SendMessageDto', () => {
  it('should reject SYSTEM type', async () => {
    const errors = await validateDto({
      type: 'SYSTEM',
      mediaUrl: 's3://bucket/key.jpg',
    });

    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('should accept TEXT type with text', async () => {
    const errors = await validateDto({ type: 'TEXT', text: '안녕' });

    expect(errors).toHaveLength(0);
  });

  it('should accept PHOTO type with mediaUrl', async () => {
    const errors = await validateDto({
      type: 'PHOTO',
      mediaUrl: 's3://bucket/key.jpg',
    });

    expect(errors).toHaveLength(0);
  });
});
