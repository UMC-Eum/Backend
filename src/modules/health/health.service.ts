import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';

export type FastApiHealthProxyResponse = {
  statusCode: number;
  contentType: string | null;
  body: unknown;
};

@Injectable()
export class HealthService {
  private readonly timeoutMs: number;
  private readonly healthUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = this.configService.get<number>(
      'FASTAPI_TIMEOUT_MS',
      10000,
    );
    this.healthUrl = this.configService.get<string>(
      'FASTAPI_HEALTH_URL',
      'http://fastapi.eum.local:8000/health',
    );
  }

  async proxyFastApiHealth(): Promise<FastApiHealthProxyResponse> {
    let response: Response;
    try {
      response = await fetch(this.healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', {
        details: {
          method: 'GET',
          url: this.healthUrl,
          timeoutMs: this.timeoutMs,
          error: this.serializeError(error),
        },
      });
    }

    const contentType = response.headers.get('content-type');
    const bodyText = await response.text();

    return {
      statusCode: response.status,
      contentType,
      body: this.parseBody(bodyText, contentType),
    };
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        cause: this.readProperty(error, 'cause'),
      };
    }

    return { message: String(error) };
  }

  private readProperty(target: unknown, key: string): unknown {
    if (typeof target !== 'object' || target === null) {
      return undefined;
    }

    return (target as Record<string, unknown>)[key];
  }

  private parseBody(bodyText: string, contentType: string | null): unknown {
    if (!contentType?.includes('application/json') || bodyText.length === 0) {
      return bodyText;
    }

    try {
      return JSON.parse(bodyText) as unknown;
    } catch {
      return bodyText;
    }
  }
}
