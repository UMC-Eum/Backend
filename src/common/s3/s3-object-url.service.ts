import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../errors/app.exception';

type ParsedS3Ref = {
  bucket: string;
  key: string;
};

const S3_REF_PREFIX = 's3://';
const DEFAULT_GET_EXPIRES_SEC = 60 * 60;
const CLIENT_URL_FIELDS = new Set([
  'profileImageUrl',
  'thumbnailUrl',
  'photoUrl',
  'imageUrl',
  'introVoiceUrl',
  'introAudioUrl',
  'mediaUrl',
]);

function parseS3Ref(input: string): ParsedS3Ref | null {
  if (!input.startsWith(S3_REF_PREFIX)) return null;

  const rest = input.slice(S3_REF_PREFIX.length);
  const separatorIndex = rest.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex === rest.length - 1) {
    throw new AppException('VALIDATION_INVALID_FORMAT', {
      message: 'S3 파일 참조 형식이 올바르지 않습니다.',
    });
  }

  return {
    bucket: rest.slice(0, separatorIndex),
    key: rest.slice(separatorIndex + 1),
  };
}

function parseS3HttpsUrl(input: string): ParsedS3Ref | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;

  const hostParts = url.hostname.split('.');
  const rawPath = url.pathname.replace(/^\/+/, '');
  if (!rawPath) return null;

  if (hostParts.length >= 3 && hostParts[1] === 's3') {
    return {
      bucket: hostParts[0],
      key: decodeURIComponent(rawPath),
    };
  }

  if (hostParts.length >= 3 && hostParts[0] === 's3') {
    const separatorIndex = rawPath.indexOf('/');
    if (separatorIndex <= 0 || separatorIndex === rawPath.length - 1) {
      return null;
    }

    return {
      bucket: rawPath.slice(0, separatorIndex),
      key: decodeURIComponent(rawPath.slice(separatorIndex + 1)),
    };
  }

  return null;
}

export function buildS3StoredRef(bucket: string, key: string): string {
  return `${S3_REF_PREFIX}${bucket}/${key}`;
}

export function normalizeS3ObjectRef(input: string): string {
  const trimmed = input.trim();
  const parsed = parseS3Ref(trimmed) ?? parseS3HttpsUrl(trimmed);
  if (!parsed) return trimmed;

  return buildS3StoredRef(parsed.bucket, parsed.key);
}

@Injectable()
export class S3ObjectUrlService {
  private readonly s3: S3Client;
  private readonly defaultBucket: string;
  private readonly getExpiresSec: number;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
    this.defaultBucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.getExpiresSec = this.configService.get<number>(
      'S3_GET_PRESIGN_EXPIRES_SEC',
      DEFAULT_GET_EXPIRES_SEC,
    );
  }

  buildStoredRef(key: string, bucket = this.defaultBucket): string {
    return buildS3StoredRef(bucket, key);
  }

  normalizeToStoredRef(input: string): string {
    return normalizeS3ObjectRef(input);
  }

  async toClientUrl(input: string | null): Promise<string | null> {
    if (!input) return null;

    const parsed = parseS3Ref(input) ?? parseS3HttpsUrl(input);
    if (!parsed) return input;

    const command = new GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.getExpiresSec });
  }

  async transformClientUrlFields<T>(value: T): Promise<T> {
    return this.transform(value, null) as Promise<T>;
  }

  private async transform(
    value: unknown,
    key: string | null,
  ): Promise<unknown> {
    if (typeof value === 'string') {
      return key && CLIENT_URL_FIELDS.has(key)
        ? this.toClientUrl(value)
        : value;
    }

    if (value === null || typeof value !== 'object' || value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.transform(item, null)));
    }

    const entries = await Promise.all(
      Object.entries(value).map(async ([entryKey, entryValue]) => [
        entryKey,
        await this.transform(entryValue, entryKey),
      ]),
    );

    return Object.fromEntries(entries);
  }
}
