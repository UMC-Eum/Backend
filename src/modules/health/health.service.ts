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
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly healthPath: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('FASTAPI_BASE_URL');
    this.timeoutMs = this.configService.get<number>(
      'FASTAPI_TIMEOUT_MS',
      10000,
    );
    this.healthPath = this.configService.get<string>(
      'FASTAPI_HEALTH_PATH',
      '/health',
    );
  }

  async proxyFastApiHealth(): Promise<FastApiHealthProxyResponse> {
    let response: Response;
    try {
      response = await fetch(this.buildUrl(this.healthPath), {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AppException('NETWORK_CONNECTION_FAILED', { details: error });
    }

    const contentType = response.headers.get('content-type');
    const bodyText = await response.text();

    return {
      statusCode: response.status,
      contentType,
      body: this.parseBody(bodyText, contentType),
    };
  }

  private buildUrl(path: string): string {
    const normalizedBaseUrl = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
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
