import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RequiredUserId } from '../../auth/decorators';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import {
  RegisterPushTokenDto,
  RevokePushTokenDto,
} from '../dtos/push-token.dto';
import { PushDeviceTokenService } from '../services/push-device-token.service';

type ApiSuccessExample<T> = {
  resultType: 'SUCCESS';
  success: { data: T };
  error: null;
  meta: { timestamp: string; path: string };
};

type ApiFailExample = {
  resultType: 'FAIL';
  success: null;
  error: { code: string; message: string };
  meta: { timestamp: string; path: string };
};

function successExample<T>(path: string, data: T): ApiSuccessExample<T> {
  return {
    resultType: 'SUCCESS',
    success: { data },
    error: null,
    meta: {
      timestamp: '2026-06-28T12:00:00.000Z',
      path,
    },
  };
}

function failExample(
  path: string,
  code: string,
  message: string,
): ApiFailExample {
  return {
    resultType: 'FAIL',
    success: null,
    error: { code, message },
    meta: {
      timestamp: '2026-06-28T12:00:00.000Z',
      path,
    },
  };
}

@ApiBearerAuth('access-token')
@Controller('push-tokens')
@UseGuards(AccessTokenGuard)
export class PushDeviceTokenController {
  constructor(
    private readonly pushDeviceTokenService: PushDeviceTokenService,
  ) {}

  @ApiOperation({ summary: 'FCM 푸시 토큰 등록/갱신' })
  @ApiOkResponse({
    schema: {
      example: successExample('/api/v1/push-tokens', {
        tokenId: '1',
        platform: 'IOS',
        lastSeenAt: '2026-06-28T12:00:00.000Z',
      }),
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      example: failExample(
        '/api/v1/push-tokens',
        'AUTH-001',
        '로그인이 필요해요.',
      ),
    },
  })
  @ApiUnprocessableEntityResponse({
    schema: {
      example: failExample(
        '/api/v1/push-tokens',
        'VALIDATION-002',
        '입력 형식이 올바르지 않아요.',
      ),
    },
  })
  @Post()
  registerToken(
    @RequiredUserId() userId: number,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushDeviceTokenService.registerToken(userId, dto);
  }

  @ApiOperation({ summary: '현재 디바이스 FCM 푸시 토큰 해제' })
  @ApiOkResponse({
    schema: {
      example: successExample('/api/v1/push-tokens/current', {}),
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      example: failExample(
        '/api/v1/push-tokens/current',
        'AUTH-001',
        '로그인이 필요해요.',
      ),
    },
  })
  @ApiUnprocessableEntityResponse({
    schema: {
      example: failExample(
        '/api/v1/push-tokens/current',
        'VALIDATION-002',
        '입력 형식이 올바르지 않아요.',
      ),
    },
  })
  @Delete('current')
  revokeToken(
    @RequiredUserId() userId: number,
    @Body() dto: RevokePushTokenDto,
  ) {
    return this.pushDeviceTokenService.revokeToken(userId, dto.token);
  }
}
