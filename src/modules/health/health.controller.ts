import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Backend health check' })
  ping() {
    return { status: 'ok' };
  }

  @Get('fastapi')
  @ApiOperation({ summary: 'FastAPI health check' })
  @ApiOkResponse({
    description: 'FastAPI health response',
    schema: {
      example: {
        status: 'ok',
      },
    },
  })
  async proxyFastApiHealth(@Res() res: Response) {
    const result = await this.healthService.proxyFastApiHealth();

    if (result.contentType) {
      res.type(result.contentType);
    }

    return res.status(result.statusCode).send(result.body);
  }

  @Get('fatapi')
  @ApiOperation({ summary: 'FastAPI health check (deprecated typo alias)' })
  async proxyFastApiHealthTypoAlias(@Res() res: Response) {
    return this.proxyFastApiHealth(res);
  }
}
