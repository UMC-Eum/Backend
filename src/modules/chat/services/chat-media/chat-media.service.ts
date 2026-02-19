import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { AppException } from '../../../../common/errors/app.exception';

import type {
  ChatUploadType,
  CreateChatMediaPresignDto,
  CreateChatMediaPresignRes,
} from '../../dtos/chat-media.dto';
import { ParticipantRepository } from '../../repositories/participant.repository';

type ParsedS3Ref = {
  bucket: string;
  key: string;
};

const S3_REF_PREFIX = 's3://';

const MAX_SIZE_BY_TYPE: Record<ChatUploadType, number> = {
  AUDIO: 20 * 1024 * 1024,
  PHOTO: 10 * 1024 * 1024,
  VIDEO: 300 * 1024 * 1024,
};

function sanitizeFileName(fileName: string): string {
  const onlyName = fileName.split('/').pop() ?? fileName;
  const sanitized = onlyName.replace(/[^a-zA-Z0-9._-]/g, '_');

  return sanitized.slice(0, 120) || 'file';
}

function parseS3Ref(input: string): ParsedS3Ref | null {
  if (!input.startsWith(S3_REF_PREFIX)) return null;

  const rest = input.slice(S3_REF_PREFIX.length);
  const idx = rest.indexOf('/');
  if (idx <= 0) return null;

  const bucket = rest.slice(0, idx).trim();
  const key = rest
    .slice(idx + 1)
    .replace(/^\/+/, '')
    .trim();

  if (!bucket || !key) return null;
  return { bucket, key };
}

function parseS3HttpsUrl(input: string): ParsedS3Ref | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const hostParts = url.hostname.split('.');

  // virtual-hosted style: <bucket>.s3.<region>.amazonaws.com/<key>
  if (hostParts.length >= 3 && hostParts[1] === 's3') {
    const bucket = hostParts[0];
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

    if (!bucket || !key) return null;
    return { bucket, key };
  }

  // path style (rare): s3.<region>.amazonaws.com/<bucket>/<key>
  if (hostParts.length >= 3 && hostParts[0] === 's3') {
    const parts = url.pathname.split('/').filter(Boolean);
    const bucket = parts[0];
    const key = decodeURIComponent(parts.slice(1).join('/'));

    if (!bucket || !key) return null;
    return { bucket, key };
  }

  return null;
}

function buildChatPrefix(chatRoomId: number): string {
  return `chat/${chatRoomId}/`;
}

function isAllowedContentType(
  type: ChatUploadType,
  contentType: string,
): boolean {
  const ct = contentType.toLowerCase();

  if (type === 'AUDIO') return ct.startsWith('audio/');
  if (type === 'PHOTO') return ct.startsWith('image/');
  if (type === 'VIDEO') return ct.startsWith('video/');

  return false;
}

function folderByType(type: ChatUploadType): string {
  if (type === 'AUDIO') return 'voices';
  if (type === 'PHOTO') return 'images';
  return 'videos';
}

@Injectable()
export class ChatMediaService {
  private readonly s3: S3Client;
  private readonly region: string;
  private readonly chatBucket: string;
  private readonly voiceBucket: string;
  private readonly putExpiresSec: number;
  private readonly getExpiresSec: number;
  private readonly allowedBuckets: Set<string>;
  private readonly logger = new Logger(ChatMediaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly participantRepo: ParticipantRepository,
  ) {
    this.region = this.configService.get<string>(
      'AWS_REGION',
      'ap-northeast-2',
    );
    this.s3 = new S3Client({ region: this.region });

    this.chatBucket = this.configService.get<string>(
      'CHAT_MEDIA_BUCKET',
      'eum-chat-media',
    );

    // 기존 프로필 음성 업로드 버킷까지 허용(기존 데이터/재사용을 위해)
    this.voiceBucket = this.configService.get<string>(
      'VOICE_UPLOAD_BUCKET',
      'eum-voice-upload',
    );

    this.putExpiresSec = this.configService.get<number>(
      'MEDIA_PUT_PRESIGN_EXPIRES_SEC',
      300,
    );

    this.getExpiresSec = this.configService.get<number>(
      'MEDIA_GET_PRESIGN_EXPIRES_SEC',
      60 * 60,
    );

    this.allowedBuckets = new Set([this.chatBucket, this.voiceBucket]);
  }

  normalizeToStoredRef(input: string): string {
    const trimmed = input.trim();
    const parsed = parseS3Ref(trimmed) ?? parseS3HttpsUrl(trimmed);

    if (!parsed) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'mediaUrl은 S3 객체를 가리켜야 합니다.',
      });
    }

    if (!this.allowedBuckets.has(parsed.bucket)) {
      throw new AppException('CHAT_ROOM_ACCESS_FAILED', {
        message: '허용되지 않은 버킷입니다.',
      });
    }

    if (parsed.bucket === this.chatBucket && !parsed.key.startsWith('chat/')) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '채팅 미디어 경로가 올바르지 않습니다.',
      });
    }

    return `${S3_REF_PREFIX}${parsed.bucket}/${parsed.key}`;
  }

  normalizeChatMediaRef(chatRoomId: number, input: string): string {
    const stored = this.normalizeToStoredRef(input);

    const expectedPrefix = `${S3_REF_PREFIX}${this.chatBucket}/${buildChatPrefix(chatRoomId)}`;
    if (!stored.startsWith(expectedPrefix)) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: '채팅 미디어 경로가 올바르지 않습니다.',
      });
    }

    return stored;
  }

  async toClientUrl(stored: string | null): Promise<string | null> {
    if (!stored) return null;

    const parsed = parseS3Ref(stored) ?? parseS3HttpsUrl(stored);
    if (!parsed) return stored;

    const command = new GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.getExpiresSec });
  }

  async createUploadPresign(
    meUserId: number,
    chatRoomId: number,
    dto: CreateChatMediaPresignDto,
  ): Promise<CreateChatMediaPresignRes> {
    const me = BigInt(meUserId);
    const roomId = BigInt(chatRoomId);

    const ok = await this.participantRepo.isParticipant(me, roomId);
    if (!ok) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const peerUserId = await this.participantRepo.findPeerUserId(roomId, me);
    if (!peerUserId) throw new AppException('CHAT_ROOM_ACCESS_FAILED');

    const isBlocked = await this.participantRepo.isBlockedBetweenUsers(
      me,
      peerUserId,
    );
    if (isBlocked) throw new AppException('CHAT_MESSAGE_BLOCKED');

    if (!isAllowedContentType(dto.type, dto.contentType)) {
      throw new AppException('VALIDATION_INVALID_FORMAT', {
        message: 'contentType이 업로드 타입과 일치하지 않습니다.',
      });
    }

    if (dto.sizeBytes && dto.sizeBytes > MAX_SIZE_BY_TYPE[dto.type]) {
      const maxBytes = MAX_SIZE_BY_TYPE[dto.type];
      const maxMb = Math.floor(maxBytes / (1024 * 1024));

      throw new AppException('CHAT_MEDIA_SIZE_EXCEEDED', {
        message: `파일 용량이 제한을 초과했습니다. (최대 ${maxMb}MB)`,
        details: {
          type: dto.type,
          sizeBytes: dto.sizeBytes,
          maxBytes,
        },
      });
    }

    this.logger.debug(
      `presign req user=${meUserId} room=${chatRoomId} type=${dto.type} ct=${dto.contentType} size=${dto.sizeBytes ?? 'N/A'}`,
    );

    const safeName = sanitizeFileName(dto.fileName);
    const folder = folderByType(dto.type);

    const key = `chat/${chatRoomId}/${folder}/${meUserId}/${Date.now()}_${randomUUID()}_${safeName}`;

    this.logger.debug(`presign key=${key}`);

    const command = new PutObjectCommand({
      Bucket: this.chatBucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.putExpiresSec,
    });

    const expiresAt = new Date(
      Date.now() + this.putExpiresSec * 1000,
    ).toISOString();

    return {
      uploadUrl,
      mediaRef: `${S3_REF_PREFIX}${this.chatBucket}/${key}`,
      key,
      expiresAt,
      requiredHeaders: {
        'Content-Type': dto.contentType,
      },
    };
  }
}
