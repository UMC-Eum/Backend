import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    getOrThrow: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    configService.getOrThrow.mockReturnValue('http://fastapi:8000');
    configService.get.mockImplementation(
      (key: string, defaultValue: unknown) =>
        key === 'FASTAPI_HEALTH_URL'
          ? 'http://fastapi.eum.local:8000/health'
          : defaultValue,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns FastAPI health response when endpoint responds with 2xx', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: jest.fn().mockResolvedValue('{"status":"ok"}'),
    } as unknown as Response);

    const service = new HealthService(
      configService as unknown as ConfigService,
    );

    await expect(service.proxyFastApiHealth()).resolves.toEqual({
      statusCode: 200,
      contentType: 'application/json',
      body: { status: 'ok' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://fastapi.eum.local:8000/health',
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.method).toBe('GET');
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns FastAPI health response when endpoint is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 503,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: jest.fn().mockResolvedValue('unavailable'),
    } as unknown as Response);

    const service = new HealthService(
      configService as unknown as ConfigService,
    );

    await expect(service.proxyFastApiHealth()).resolves.toEqual({
      statusCode: 503,
      contentType: 'text/plain',
      body: 'unavailable',
    });
  });
});
