import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../../services/user/user.service';
import { AccessTokenGuard } from '../../../auth/guards/access-token.guard';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: { getMe: jest.fn() },
        },
        {
          provide: AccessTokenGuard,
          useValue: {
            canActivate: jest.fn(() => true), 
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
