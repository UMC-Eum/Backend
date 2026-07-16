import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { AppException } from '../errors/app.exception';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({
        originalUrl: '/api/v1/articles',
        url: '/api/v1/articles',
        method: 'POST',
      }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  it('exposes moderation violation categories to clients', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createHost();
    const details = {
      surface: 'ARTICLE',
      violatedCategories: ['폭력적 언행'],
    };

    filter.catch(
      new AppException('CONTENT_POLICY_VIOLATION', { details }),
      host,
    );

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: 'VALID-003',
          message:
            '커뮤니티 가이드라인에 맞지 않는 내용이 포함되어 있어 등록할 수 없습니다.',
          details,
        },
      }),
    );
  });

  it('does not expose generic exception details to clients', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json } = createHost();

    filter.catch(
      new AppException('VALIDATION_INVALID_FORMAT', {
        details: { field: 'cursor' },
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: 'VALID-001',
          message:
            '입력 형식이 올바르지 않습니다. 형식에 맞게 다시 입력해 주세요.',
        },
      }),
    );
  });
});
