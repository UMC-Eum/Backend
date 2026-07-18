import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../../auth/services/jwt-token.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { MeetingService } from '../services/meeting.service';
import { MeetingController } from './meeting.controller';

describe('MeetingController', () => {
  let controller: MeetingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock-value') },
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
          useValue: { $connect: jest.fn(), $disconnect: jest.fn() },
        },
        {
          provide: MeetingService,
          useValue: {
            createMeeting: jest.fn(),
            deleteMeeting: jest.fn(),
          },
        },
        AccessTokenGuard,
      ],
    }).compile();

    controller = module.get<MeetingController>(MeetingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
