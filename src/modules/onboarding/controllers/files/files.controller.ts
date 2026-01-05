import { Controller, Post, Body, UseInterceptors, HttpStatus } from '@nestjs/common';
import { FileUploadService } from '../../services/files/files.service';
import { PresignFileDto } from '../../dtos/files.dto';
import { AppException } from '../../../../common/errors/app.exception';
import { ERROR_CODE } from '../../../../common/errors/error-codes';

@Controller('files')
export class FilesController {
    constructor(private readonly fileUploadService: FileUploadService) {}

    @Post('presign')
    async getPresignedUrl(@Body() dto: PresignFileDto) {
      try {
        const result = await this.fileUploadService.generatePresignedUrl(dto);
        return result;
      } catch (err) {

        throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, {
            code: ERROR_CODE.COMMON_INTERNAL_ERROR,
            message: 'S3 presigned URL 생성 실패',
          });
      }
    }

}