import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../../../auth/services/jwt-token.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { HeartService } from '../../services/heart/heart.service';
import { HeartController } from './heart.controller';

describe('HeartController', () => {
  let controller: HeartController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeartController],
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
          provide: HeartService,
          useValue: {
            createHeart: jest.fn(),
            removeHeart: jest.fn(),
            getReceivedHearts: jest.fn(),
            getSentHearts: jest.fn(),
          },
        },
        AccessTokenGuard,
      ],
    }).compile();

    controller = module.get<HeartController>(HeartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
