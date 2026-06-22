import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from '../services/article.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';

describe('ArticleController', () => {
  let controller: ArticleController;
  const serviceMock = {
    findClubArticles: jest.fn(),
    findArticleDetail: jest.fn(),
    createArticle: jest.fn(),
    pinArticle: jest.fn(),
    findArchivePhotos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ArticleController>(ArticleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('pinArticle should call service and return result', async () => {
    const expected = { articleId: 1, isPinned: true, updatedAt: '2026-05-01T17:40:00.000Z' };
    serviceMock.pinArticle.mockResolvedValue(expected);

    const res = await controller.pinArticle(1, 1, 1, { isPinned: true });
    expect(serviceMock.pinArticle).toHaveBeenCalledWith(1, 1, 1, { isPinned: true });
    expect(res).toEqual(expected);
  });

  it('findArchive should call service and return result', async () => {
    const expected = {
      items: [
        { photoId: 101, articleId: 1, photoUrl: 'https://example.com/photo1.jpg', createdAt: '2026-05-01T17:40:00.000Z' },
      ],
      nextCursor: 'eyJpZCI6IjEwMSJ9',
      hasMore: false,
    };
    serviceMock.findArchivePhotos.mockResolvedValue(expected);

    const res = await controller.findArchive(1, { sort: 'recent' });
    expect(serviceMock.findArchivePhotos).toHaveBeenCalledWith(1, { sort: 'recent' });
    expect(res).toEqual(expected);
  });
});
