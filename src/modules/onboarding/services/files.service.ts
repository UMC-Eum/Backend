import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignFileDto } from '../dtos/files.dto';
import { ConfigService } from '@nestjs/config';
import { S3ObjectUrlService } from '../../../common/s3/s3-object-url.service';

@Injectable()
export class FileUploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly putExpiresSec = 300;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3ObjectUrlService: S3ObjectUrlService,
  ) {
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
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
  }

  async generatePresignedUrl(userId: number, dto: PresignFileDto) {
    const { fileName, contentType, purpose } = dto;
    const objectName = `${Date.now()}_${fileName}`;

    // purpose에 따른 폴더 경로 결정
    const key =
      purpose === 'PROFILE_INTRO_AUDIO'
        ? `voices/${userId}/${objectName}`
        : purpose === 'CLUB'
          ? `images/${userId}/club/${objectName}`
          : `images/${userId}/${objectName}`;

    // 업로드용 Presigned URL (PUT)
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, putCommand, {
      expiresIn: this.putExpiresSec,
    });

    return {
      uploadUrl,
      fileRef: this.s3ObjectUrlService.buildStoredRef(key, this.bucket),
      key,
      expiresAt: new Date(Date.now() + this.putExpiresSec * 1000).toISOString(),
    };
  }
}
