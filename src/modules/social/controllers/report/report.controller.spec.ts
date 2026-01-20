import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../../../auth/services/jwt-token.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { ReportService } from '../../services/report/report.service';
import { ReportController } from './report.controller';

describe('ReportController', () => {
  let controller: ReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: JwtTokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
            extractTokenFromHeader: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: ReportService,
          useValue: {
            createReport: jest.fn(),
          },
        },
        AccessTokenGuard,
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
