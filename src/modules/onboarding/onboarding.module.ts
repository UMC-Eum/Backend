import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files/files.controller';
import { FileUploadService } from './services/files/files.service';

@Module({
  controllers: [FilesController],
  providers: [FileUploadService],
})
export class OnboardingModule {}
