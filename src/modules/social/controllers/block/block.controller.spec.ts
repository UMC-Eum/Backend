import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../../../auth/services/jwt-token.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';
import { BlockService } from '../../services/block/block.service';
import { BlockController } from './block.controller';

describe('BlockController', () => {
  let controller: BlockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockController],
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
          provide: BlockService,
          useValue: {
            createBlock: jest.fn(),
            removeBlock: jest.fn(),
            getBlockedUsers: jest.fn(),
          },
        },
        AccessTokenGuard,
      ],
    }).compile();

    controller = module.get<BlockController>(BlockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
