import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { ArticleRepository } from '../repositories/article.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '@prisma/client';

describe('ArticleService', () => {
  let service: ArticleService;
  const repositoryMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createArticle: jest.fn(),
    findArticleDetail: jest.fn(),
    likeArticle: jest.fn(),
    unlikeArticle: jest.fn(),
    pinArticle: jest.fn(),
    findArchivePhotos: jest.fn(),
    existsClub: jest.fn(),
    existsActiveClubUser: jest.fn(),
  };
  const notificationServiceMock = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: ArticleRepository,
          useValue: repositoryMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createArticle', () => {
    it('throws ARTICLE_MEMBER_ONLY when user is not an active club member', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(false);

      await expect(
        service.createArticle(1, 1, {
          title: 'title',
          contents: 'contents',
          category: 'FREE',
        }),
      ).rejects.toMatchObject({
        internalCode: 'ARTICLE_MEMBER_ONLY',
      });
      expect(repositoryMock.createArticle).not.toHaveBeenCalled();
    });
  });

  describe('findArticleDetail', () => {
    it('checks active club membership before reading detail', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(false);

      await expect(service.findArticleDetail(1, 1, 1)).rejects.toMatchObject({
        internalCode: 'ARTICLE_MEMBER_ONLY',
      });
      expect(repositoryMock.findArticleDetail).not.toHaveBeenCalled();
    });
  });

  describe('pinArticle', () => {
    it('returns pin response on success', async () => {
      repositoryMock.pinArticle.mockResolvedValue({
        status: 'success',
        article: {
          id: BigInt(1),
          isPinned: true,
          updatedAt: new Date('2026-05-01T17:40:00.000Z'),
        },
      });

      const res = await service.pinArticle(1, 1, 1, { isPinned: true });

      expect(res.articleId).toBe(1);
      expect(res.isPinned).toBe(true);
      expect(res.updatedAt).toBe('2026-05-01T17:40:00.000Z');
    });

    it('throws AppException when not_found', async () => {
      repositoryMock.pinArticle.mockResolvedValue({ status: 'not_found' });

      await expect(
        service.pinArticle(1, 1, 999, { isPinned: true }),
      ).rejects.toThrow();
    });

    it('throws AppException when forbidden', async () => {
      repositoryMock.pinArticle.mockResolvedValue({ status: 'forbidden' });

      await expect(
        service.pinArticle(2, 1, 1, { isPinned: true }),
      ).rejects.toMatchObject({
        internalCode: 'CLUB_FORBIDDEN_NOT_HOST',
      });
    });
  });

  describe('likeArticle', () => {
    it('checks active club membership before liking', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(false);

      await expect(service.likeArticle(1, 1, 1)).rejects.toMatchObject({
        internalCode: 'ARTICLE_MEMBER_ONLY',
      });
      expect(repositoryMock.likeArticle).not.toHaveBeenCalled();
    });

    it('creates notification for article author when a new like is created', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(true);
      repositoryMock.likeArticle.mockResolvedValue({
        status: 'success',
        created: true,
        article: {
          id: BigInt(10),
          likes: 3,
          userId: BigInt(20),
          user: { nickname: '받는사람' },
          club: { name: '한강 라이딩 동호회' },
        },
        sender: { nickname: '보낸사람' },
      });

      const res = await service.likeArticle(11, 1, 10);

      expect(res).toEqual({ articleId: 10, isLiked: true, likeCount: 3 });
      expect(notificationServiceMock.createNotification).toHaveBeenCalledWith(
        20,
        NotificationType.ARTICLE,
        '회원님의 게시물에 좋아요가 눌렸어요.',
        '[한강 라이딩 동호회]보낸사람님이 회원님의 게시물에 좋아요를 눌렀어요.',
        11,
      );
    });

    it('does not create notification for duplicate like or self like', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(true);
      repositoryMock.likeArticle.mockResolvedValueOnce({
        status: 'success',
        created: false,
        article: {
          id: BigInt(10),
          likes: 3,
          userId: BigInt(20),
          user: { nickname: '받는사람' },
          club: { name: '한강 라이딩 동호회' },
        },
        sender: { nickname: '보낸사람' },
      });

      await service.likeArticle(11, 1, 10);

      repositoryMock.likeArticle.mockResolvedValueOnce({
        status: 'success',
        created: true,
        article: {
          id: BigInt(10),
          likes: 4,
          userId: BigInt(11),
          user: { nickname: '보낸사람' },
          club: { name: '한강 라이딩 동호회' },
        },
        sender: { nickname: '보낸사람' },
      });

      await service.likeArticle(11, 1, 10);

      expect(notificationServiceMock.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('unlikeArticle', () => {
    it('checks active club membership before unliking', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.existsActiveClubUser.mockResolvedValue(false);

      await expect(service.unlikeArticle(1, 1, 1)).rejects.toMatchObject({
        internalCode: 'ARTICLE_MEMBER_ONLY',
      });
      expect(repositoryMock.unlikeArticle).not.toHaveBeenCalled();
    });
  });

  describe('findArchivePhotos', () => {
    it('returns archive response with paginated photos', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      repositoryMock.findArchivePhotos.mockResolvedValue([
        {
          id: BigInt(101),
          photoUrl: 'https://example.com/photo1.jpg',
          articleId: BigInt(1),
          createdAt: new Date('2026-05-01T17:40:00.000Z'),
        },
      ]);

      const res = await service.findArchivePhotos(1, { sort: 'recent' });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].photoId).toBe(101);
      expect(res.items[0].articleId).toBe(1);
      expect(res.hasMore).toBe(false);
      expect(res.nextCursor).toBeNull();
    });

    it('sets hasMore true when extra photo exists', async () => {
      repositoryMock.existsClub.mockResolvedValue(true);
      const mockPhotos = Array(21)
        .fill(0)
        .map((_, i) => ({
          id: BigInt(100 + i),
          photoUrl: `https://example.com/photo${i}.jpg`,
          articleId: BigInt(1),
          createdAt: new Date('2026-05-01T17:40:00.000Z'),
        }));
      repositoryMock.findArchivePhotos.mockResolvedValue(mockPhotos);

      const res = await service.findArchivePhotos(1, { limit: 20 });

      expect(res.items).toHaveLength(20);
      expect(res.hasMore).toBe(true);
      expect(res.nextCursor).not.toBeNull();
    });

    it('throws AppException when club not found', async () => {
      repositoryMock.existsClub.mockResolvedValue(false);

      await expect(
        service.findArchivePhotos(999, { sort: 'recent' }),
      ).rejects.toThrow();
    });
  });
});
