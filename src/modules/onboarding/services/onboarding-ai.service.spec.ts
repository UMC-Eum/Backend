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
            matchedKeywords: [
              {
                category: 'PERSONALITY',
                id: 21,
                keyword: '차분함',
                score: 0.86,
              },
            ],
            summary: '조용한 공간에서 독서와 산책을 즐기는 차분한 성향입니다.',
            transcript:
              '저는 조용한 카페에서 책 읽는 걸 좋아하고, 주말에는 가볍게 산책하는 편입니다.',
            vibeVector: [0.1, -0.2],
          },
        },
      }),
    );

    await expect(service.analyzeProfile(1, dto)).resolves.toEqual({
      matchedKeywords: [
        {
          category: 'PERSONALITY',
          id: 21,
          keyword: '차분함',
          score: 0.86,
        },
      ],
      selectedKeywords: ['차분함'],
      summary: '조용한 공간에서 독서와 산책을 즐기는 차분한 성향입니다.',
      transcript:
        '저는 조용한 카페에서 책 읽는 걸 좋아하고, 주말에는 가볍게 산책하는 편입니다.',
      vibeVector: [0.1, -0.2],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({
      birthdate: '1972-03-01',
      introAudioUrl: 'https://cdn.example.com/intro.m4a',
      sex: 'F',
    });
  });

  it('sends clubId, transcript, and analysis_type to FastAPI for club vibe analysis', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'SUCCESS',
        success: {
          data: {
            clubId: 12,
            transcript: '함께 새벽 산행할 분들 모집해요.',
            summary: '새벽 산행 모임',
            vectorId: '12',
            matchedKeywords: [
              {
                category: 'ACTIVITY',
                id: 3,
                keyword: '활동적',
                score: 0.82,
              },
            ],
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
      matchedKeywords: [
        {
          category: 'ACTIVITY',
          id: 3,
          keyword: '활동적',
          score: 0.82,
        },
      ],
      selectedKeywords: ['활동적'],
      vibeVector: [0.1, -0.2],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({
      clubId: 12,
      transcript: '함께 새벽 산행할 분들 모집해요.',
      analysis_type: 'profile',
    });
  });

  it('passes optional areaCode when requesting recommended clubs', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        resultType: 'SUCCESS',
        success: {
          data: {
            items: [],
            page: {
              size: 20,
              hasNext: false,
              nextCursor: null,
            },
          },
        },
      }),
    );

    await service.getRecommendedClubs(
      7n,
      'eyJzaW1pbGFyaXR5U2NvcmUiOjAuNDEyMywiY2x1YklkIjoiOCJ9',
      '20',
      '1168000000',
    );

    const [url] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(url as string);
    expect(parsedUrl.searchParams.get('userId')).toBe('7');
    expect(parsedUrl.searchParams.get('cursor')).toBe(
      'eyJzaW1pbGFyaXR5U2NvcmUiOjAuNDEyMywiY2x1YklkIjoiOCJ9',
    );
    expect(parsedUrl.searchParams.get('size')).toBe('20');
    expect(parsedUrl.searchParams.get('areaCode')).toBe('1168000000');
  });
});
