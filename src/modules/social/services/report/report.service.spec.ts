import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { ReportRepository } from '../../repositories/report.repository';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: ReportRepository,
          useValue: {
            createReport: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
