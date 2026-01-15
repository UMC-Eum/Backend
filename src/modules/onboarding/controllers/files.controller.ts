import { Controller, Post, Body } from '@nestjs/common';
import { FileUploadService } from '../services/files.service';
import { PresignFileDto } from '../dtos/files.dto';
import { AppException } from '../../../common/errors/app.exception';

@Controller('files')
export class FilesController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('presign')
  async getPresignedUrl(@Body() dto: PresignFileDto) {
    try {
      const result = await this.fileUploadService.generatePresignedUrl(dto);

      return {
        data: result,
      };
    } catch (err) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        details: err,
      });
    }
  }
}