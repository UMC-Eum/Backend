import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = {
    proxyFastApiHealth: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns backend health status', () => {
    expect(controller.ping()).toEqual({ status: 'ok' });
  });

  it('proxies FastAPI health response', async () => {
    healthService.proxyFastApiHealth.mockResolvedValue({
      statusCode: 200,
      contentType: 'application/json',
      body: { status: 'ok' },
    });

    const res = {
      type: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.proxyFastApiHealth(res as never);

    expect(res.type).toHaveBeenCalledWith('application/json');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('keeps typo alias for FastAPI health response', async () => {
    healthService.proxyFastApiHealth.mockResolvedValue({
      statusCode: 200,
      contentType: null,
      body: { status: 'ok' },
    });

    const res = {
      type: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.proxyFastApiHealthTypoAlias(res as never);

    expect(res.type).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
  });
});
