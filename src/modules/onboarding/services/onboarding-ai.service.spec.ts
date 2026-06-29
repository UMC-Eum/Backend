import { ConfigService } from '@nestjs/config';
import { OnboardingAiService } from './onboarding-ai.service';

describe('OnboardingAiService', () => {
  let service: OnboardingAiService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const dto = {
    nickname: '루씨',
    gender: 'F',
    birthDate: '1972-03-01',
    areaCode: '1168000000',
    introText: '안녕하세요',
    introAudioUrl: 'https://cdn.example.com/intro.m4a',
  };

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:8000'),
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === 'FASTAPI_PROFILE_ANALYSIS_PATH') {
          return '/api/v1/onboarding/voice-profile/analyze';
        }
        return fallback;
      }),
    };

    service = new OnboardingAiService(
      configService as unknown as ConfigService,
    );
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('maps network failures to NETWORK_CONNECTION_FAILED', async () => {
    fetchMock.mockRejectedValue(new Error('connect failed'));

    await expect(service.analyzeProfile(1, dto)).rejects.toMatchObject({
      internalCode: 'NETWORK_CONNECTION_FAILED',
    });
  });

  it('maps non-2xx FastAPI responses to SERVER_TEMPORARY_ERROR', async () => {
    fetchMock.mockResolvedValue(
      new Response('internal error', { status: 500 }),
    );

    await expect(service.analyzeProfile(1, dto)).rejects.toMatchObject({
      internalCode: 'SERVER_TEMPORARY_ERROR',
    });
  });

  it('maps FastAPI failure envelopes to SERVER_TEMPORARY_ERROR', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'FAIL',
        success: null,
        error: { code: 'AI-001', message: 'analysis failed' },
      }),
    );

    await expect(service.analyzeProfile(1, dto)).rejects.toMatchObject({
      internalCode: 'SERVER_TEMPORARY_ERROR',
    });
  });

  it('rejects successful responses with missing vibeVector', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'SUCCESS',
        success: {
          data: {
            selectedKeywords: ['등산'],
          },
        },
      }),
    );

    await expect(service.analyzeProfile(1, dto)).rejects.toMatchObject({
      internalCode: 'SERVER_TEMPORARY_ERROR',
    });
  });

  it('extracts profile analysis data from successful FastAPI responses', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'SUCCESS',
        success: {
          data: {
            matchedKeywords: [{ keyword: '등산' }],
            vibeVector: [0.1, -0.2],
          },
        },
      }),
    );

    await expect(service.analyzeProfile(1, dto)).resolves.toEqual({
      selectedKeywords: ['등산'],
      vibeVector: [0.1, -0.2],
    });
  });

  it('sends transcript and analysis_type to FastAPI for club vibe analysis', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: 12,
            transcript: '함께 새벽 산행할 분들 모집해요.',
            summary: '새벽 산행 모임',
            vectorId: '12',
            matchedKeywords: [{ keyword: '등산' }],
            vibeVector: [0.1, -0.2],
          },
        },
      }),
    );

    await expect(
      service.analyzeClubVibe({
        clubId: 12,
        transcript: '함께 새벽 산행할 분들 모집해요.',
        analysis_type: 'profile',
      }),
    ).resolves.toMatchObject({
      clubId: 12,
      selectedKeywords: ['등산'],
      vibeVector: [0.1, -0.2],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({
      transcript: '함께 새벽 산행할 분들 모집해요.',
      analysis_type: 'profile',
    });
  });
});
