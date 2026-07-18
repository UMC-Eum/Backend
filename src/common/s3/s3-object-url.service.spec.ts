import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3ObjectUrlService,
  normalizeS3ObjectRef,
} from './s3-object-url.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('normalizeS3ObjectRef', () => {
  it('keeps s3 refs unchanged', () => {
    expect(normalizeS3ObjectRef('s3://bucket/images/1.jpg')).toBe(
      's3://bucket/images/1.jpg',
    );
  });

  it('normalizes virtual-hosted S3 URLs to s3 refs', () => {
    expect(
      normalizeS3ObjectRef(
        'https://bucket.s3.ap-northeast-2.amazonaws.com/images/1.jpg?X-Amz-Signature=abc',
      ),
    ).toBe('s3://bucket/images/1.jpg');
  });

  it('keeps non-S3 URLs unchanged', () => {
    expect(normalizeS3ObjectRef('https://cdn.example.com/images/1.jpg')).toBe(
      'https://cdn.example.com/images/1.jpg',
    );
  });
});

describe('S3ObjectUrlService', () => {
  const getSignedUrlMock = getSignedUrl as jest.MockedFunction<
    typeof getSignedUrl
  >;
  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'AWS_REGION') return 'ap-northeast-2';
      if (key === 'S3_GET_PRESIGN_EXPIRES_SEC') return 3600;
      return defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'AWS_S3_BUCKET') return 'bucket';
      throw new Error(`Unexpected config key: ${key}`);
    }),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-07T00:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses a presigned GET URL until it expires', async () => {
    getSignedUrlMock.mockResolvedValueOnce('https://signed-url-1');
    const service = new S3ObjectUrlService(configService as never);

    await expect(service.toClientUrl('s3://bucket/images/1.jpg')).resolves.toBe(
      'https://signed-url-1',
    );

    jest.setSystemTime(new Date('2026-07-07T00:59:59.000Z'));

    await expect(service.toClientUrl('s3://bucket/images/1.jpg')).resolves.toBe(
      'https://signed-url-1',
    );
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
  });

  it('issues a new presigned GET URL after the cached URL expires', async () => {
    getSignedUrlMock
      .mockResolvedValueOnce('https://signed-url-1')
      .mockResolvedValueOnce('https://signed-url-2');
    const service = new S3ObjectUrlService(configService as never);

    await expect(service.toClientUrl('s3://bucket/images/1.jpg')).resolves.toBe(
      'https://signed-url-1',
    );

    jest.setSystemTime(new Date('2026-07-07T01:00:00.000Z'));

    await expect(service.toClientUrl('s3://bucket/images/1.jpg')).resolves.toBe(
      'https://signed-url-2',
    );
    expect(getSignedUrlMock).toHaveBeenCalledTimes(2);
  });
});
