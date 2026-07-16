import { Global, Module } from '@nestjs/common';
import { S3ObjectUrlModule } from '../s3/s3-object-url.module';
import { ContentModerationInterceptor } from './content-moderation.interceptor';
import { ContentModerationService } from './content-moderation.service';

@Global()
@Module({
  imports: [S3ObjectUrlModule],
  providers: [ContentModerationService, ContentModerationInterceptor],
  exports: [ContentModerationService, ContentModerationInterceptor],
})
export class ContentModerationModule {}
