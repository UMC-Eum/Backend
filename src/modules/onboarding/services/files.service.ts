import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignFileDto } from '../dtos/files.dto';
import * as process from 'process';

@Injectable()
export class FileUploadService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET!;
  }

  async generatePresignedUrl(userId: number, dto: PresignFileDto) {
    const { fileName, contentType, purpose } = dto;

    // purpose에 따른 폴더 경로 결정
    const folder = purpose === 'PROFILE_INTRO_AUDIO' ? 'voices' : 'images';

    const key = `${folder}/${userId}/${Date.now()}_${fileName}`;

    // 업로드용 Presigned URL (PUT)
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, putCommand, {
      expiresIn: 300,
    });

    // 다운로드용 Presigned URL (GET)
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(this.s3, getCommand, {
      expiresIn: 3600 * 24 * 7,
    });

    return {
      uploadUrl,
      fileUrl: downloadUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}
