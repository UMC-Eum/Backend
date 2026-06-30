import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from '../services/comment.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';

describe('CommentController', () => {
  let controller: CommentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CommentController>(CommentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
