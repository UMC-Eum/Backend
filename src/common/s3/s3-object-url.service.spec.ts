import { normalizeS3ObjectRef } from './s3-object-url.service';

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
