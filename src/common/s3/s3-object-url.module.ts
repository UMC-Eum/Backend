import { Global, Module } from '@nestjs/common';
import { S3ObjectUrlService } from './s3-object-url.service';

@Global()
@Module({
  providers: [S3ObjectUrlService],
  exports: [S3ObjectUrlService],
})
export class S3ObjectUrlModule {}
