import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FileUploadService } from '../services/files.service';
import { PresignFileDto } from '../dtos/files.dto';
import { AppException } from '../../../common/errors/app.exception';
import { RequiredUserId } from 'src/modules/auth/decorators';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/guards/access-token.guard';

@ApiTags('Files')
@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('presign')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '파일 업로드용 presigned URL 발급',
    description:
      "프로필 소개 음성, 프로필 이미지, 클럽 이미지 업로드용 S3 presigned URL을 발급합니다. purpose가 'CLUB'이면 파일은 images/{userId}/club 경로에 저장됩니다.",
  })
  @ApiBody({
    type: PresignFileDto,
    examples: {
      profileIntroAudio: {
        summary: '프로필 소개 음성 업로드',
        value: {
          fileName: 'intro.m4a',
          contentType: 'audio/mp4',
          purpose: 'PROFILE_INTRO_AUDIO',
        },
      },
      profileImage: {
        summary: '프로필 이미지 업로드',
        value: {
          fileName: 'profile.jpg',
          contentType: 'image/jpeg',
          purpose: 'PROFILE_IMAGE',
        },
      },
      clubImage: {
        summary: '클럽 이미지 업로드',
        value: {
          fileName: 'club-cover.jpg',
          contentType: 'image/jpeg',
          purpose: 'CLUB',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'presigned URL 발급 성공',
    schema: {
      example: {
        resultType: 'SUCCESS',
        success: {
          data: {
            data: {
              uploadUrl:
                'https://bucket.s3.ap-northeast-2.amazonaws.com/images/42/club/1783139000000_club-cover.jpg?...',
              fileUrl:
                'https://bucket.s3.ap-northeast-2.amazonaws.com/images/42/club/1783139000000_club-cover.jpg?...',
              expiresAt: '2026-07-11T00:00:00.000Z',
            },
          },
        },
        error: null,
        meta: {
          timestamp: '2026-07-04T00:00:00.000Z',
          path: '/api/v1/files/presign',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '인증 실패 (액세스 토큰 필요)' })
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
