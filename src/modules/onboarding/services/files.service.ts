import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignFileDto } from '../dtos/files.dto';
import * as process from 'process';

@Injectable()
export class FileUploadService {
  // 클래스 필드 정의
  private s3: S3Client;
  private bucket: string;

  // S3 클라이언트 초기화
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

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const fileUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
}
