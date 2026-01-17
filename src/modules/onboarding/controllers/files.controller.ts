import { Controller, Post, Body } from '@nestjs/common';
import { FileUploadService } from '../services/files.service';
import { PresignFileDto } from '../dtos/files.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import { ApiBody } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';

@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('presign')
  @UseGuards(AccessTokenGuard)
  @ApiBody({ type: PresignFileDto })
  async getPresignedUrl(
    @RequiredUserId() userId: number,
    @Body() dto: PresignFileDto,
  ) {
    try {
      const result = await this.fileUploadService.generatePresignedUrl(
        userId,
        dto,
      );

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
