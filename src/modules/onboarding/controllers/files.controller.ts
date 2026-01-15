import { Controller, Post, Body } from '@nestjs/common';
import { FileUploadService } from '../services/files.service';
import { PresignFileDto } from '../dtos/files.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';

@Controller('files')
export class FilesController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('presign')
  async getPresignedUrl(@RequiredUserId() userId: number, @Body() dto: PresignFileDto) {
    try {
      const result = await this.fileUploadService.generatePresignedUrl(userId, dto);

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