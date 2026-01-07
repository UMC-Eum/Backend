import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app/app.module';
import type { ApiSuccessResponse } from '../src/common/dto/api-response.dto';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1 (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);

    const body = res.body as ApiSuccessResponse<{ message: string }>;

    expect(body.resultType).toBe('SUCCESS');
    expect(body.error).toBeNull();

    expect(body.success.data).toEqual({ message: 'Hello World!' });

    expect(body.meta.path).toBe('/api/v1');
    expect(typeof body.meta.timestamp).toBe('string');
  });
});
