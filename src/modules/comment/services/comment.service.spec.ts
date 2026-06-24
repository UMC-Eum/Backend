import { Test, TestingModule } from '@nestjs/testing';
import { ClubAuthority } from '@prisma/client';
import { CommentService } from './comment.service';
import { CommentRepository } from '../repositories/comment.repository';
import { AppException } from '../../../common/errors/app.exception';

describe('CommentService', () => {
  let service: CommentService;
  const repository = {
    findClubById: jest.fn(),
    findArticleByClubId: jest.fn(),
    findActiveClubUser: jest.fn(),
    findParentComment: jest.fn(),
    createComment: jest.fn(),
    countComments: jest.fn(),
    findCommentCursor: jest.fn(),
    findCommentsWithReplies: jest.fn(),
    findCommentByArticleId: jest.fn(),
    softDeleteComment: jest.fn(),
  };

  const userId = 1;
  const clubId = 1;
  const articleId = 1;

  beforeEach(async () => {
    Object.values(repository).forEach((mock) => mock.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: CommentRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('댓글을 작성한다', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.createComment.mockResolvedValue({
      id: 555n,
      articleId: 1n,
      parentCommentId: null,
      depth: 0,
      contents: '공감 가는 글이네요 :)',
      createdAt: new Date('2026-05-01T15:20:00.000Z'),
      user: {
        id: 1n,
        nickname: '달콤한목소리',
        profileImageUrl: 'https://cdn.example.com/profile/1.jpg',
      },
    });

    const result = await service.createComment(userId, clubId, articleId, {
      contents: '공감 가는 글이네요 :)',
      parentCommentId: null,
    });

    expect(result).toMatchObject({
      commentId: 555,
      articleId,
      depth: 0,
      contents: '공감 가는 글이네요 :)',
    });
    expect(repository.createComment).toHaveBeenCalledWith({
      articleId: 1n,
      userId: 1n,
      contents: '공감 가는 글이네요 :)',
      parentCommentId: null,
      depth: 0,
    });
  });

  it('클럽 멤버가 아니면 댓글 작성이 거부된다', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue(null);

    await expect(
      service.createComment(userId, clubId, articleId, {
        contents: '댓글',
        parentCommentId: null,
      }),
    ).rejects.toMatchObject({
      internalCode: 'CLUB_FORBIDDEN_NOT_MEMBER',
    } satisfies Partial<AppException>);
    expect(repository.createComment).not.toHaveBeenCalled();
  });

  it('부모 댓글이 대댓글이면 COMMENT_DEPTH_EXCEEDED', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.findParentComment.mockResolvedValue({ id: 2n, depth: 1 });

    await expect(
      service.createComment(userId, clubId, articleId, {
        contents: '대대댓글',
        parentCommentId: 2,
      }),
    ).rejects.toMatchObject({
      internalCode: 'COMMENT_DEPTH_EXCEEDED',
    });
    expect(repository.createComment).not.toHaveBeenCalled();
  });

  it('댓글 목록을 조회한다', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.countComments.mockResolvedValue(2);
    repository.findCommentsWithReplies.mockResolvedValue([
      {
        id: 555n,
        articleId: 1n,
        parentCommentId: null,
        depth: 0,
        contents: '부모 댓글',
        userId: 2n,
        createdAt: new Date('2026-05-01T15:20:00.000Z'),
        user: {
          id: 2n,
          nickname: '보이스마스터',
          profileImageUrl: 'https://cdn.example.com/profile/2.jpg',
          clubUsers: [{ authority: ClubAuthority.HOST }],
        },
        replies: [
          {
            id: 556n,
            articleId: 1n,
            parentCommentId: 555n,
            depth: 1,
            contents: '대댓글',
            userId: 1n,
            createdAt: new Date('2026-05-01T15:25:00.000Z'),
            user: {
              id: 1n,
              nickname: '달콤한목소리',
              profileImageUrl: 'https://cdn.example.com/profile/1.jpg',
              clubUsers: [{ authority: ClubAuthority.GENERAL }],
            },
          },
        ],
      },
    ]);

    const result = await service.listComments(userId, clubId, articleId, {});

    expect(result).toMatchObject({
      articleId,
      totalCount: 2,
      hasMore: false,
      nextCursor: null,
      comments: [
        {
          commentId: 555,
          isMine: false,
          author: { authority: ClubAuthority.HOST },
          replies: [
            {
              commentId: 556,
              isMine: true,
              author: { authority: ClubAuthority.GENERAL },
            },
          ],
        },
      ],
    });
  });

  it('limit보다 결과가 많으면 nextCursor와 hasMore를 내려준다', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.countComments.mockResolvedValue(2);
    repository.findCommentsWithReplies.mockResolvedValue([
      {
        id: 555n,
        parentCommentId: null,
        depth: 0,
        contents: '첫 댓글',
        userId: 1n,
        createdAt: new Date('2026-05-01T15:20:00.000Z'),
        user: {
          id: 1n,
          nickname: '나',
          profileImageUrl: 'https://cdn.example.com/profile/1.jpg',
          clubUsers: [{ authority: ClubAuthority.GENERAL }],
        },
        replies: [],
      },
      {
        id: 554n,
        parentCommentId: null,
        depth: 0,
        contents: '다음 댓글',
        userId: 2n,
        createdAt: new Date('2026-05-01T15:19:00.000Z'),
        user: {
          id: 2n,
          nickname: '상대',
          profileImageUrl: 'https://cdn.example.com/profile/2.jpg',
          clubUsers: [{ authority: ClubAuthority.GENERAL }],
        },
        replies: [],
      },
    ]);

    const result = await service.listComments(userId, clubId, articleId, {
      limit: 1,
    });

    expect(result.hasMore).toBe(true);
    expect(result.comments).toHaveLength(1);
    expect(result.nextCursor).toBe(
      Buffer.from(JSON.stringify({ id: 555 }), 'utf8').toString('base64'),
    );
  });

  it('댓글 작성자가 아니면 삭제가 거부된다', async () => {
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.findCommentByArticleId.mockResolvedValue({
      id: 555n,
      userId: 2n,
    });

    await expect(
      service.deleteComment(userId, clubId, articleId, 555),
    ).rejects.toMatchObject({
      internalCode: 'COMMENT_FORBIDDEN_NOT_AUTHOR',
    });
    expect(repository.softDeleteComment).not.toHaveBeenCalled();
  });

  it('댓글을 삭제한다', async () => {
    const deletedAt = new Date('2026-05-01T15:25:00.000Z');
    repository.findClubById.mockResolvedValue({ id: 1n, deletedAt: null });
    repository.findArticleByClubId.mockResolvedValue({ id: 1n });
    repository.findActiveClubUser.mockResolvedValue({ id: 10n });
    repository.findCommentByArticleId.mockResolvedValue({
      id: 555n,
      userId: 1n,
    });
    repository.softDeleteComment.mockResolvedValue({
      id: 555n,
      deletedAt,
    });

    const result = await service.deleteComment(userId, clubId, articleId, 555);

    expect(result).toEqual({
      commentId: 555,
      deletedAt: deletedAt.toISOString(),
    });
    expect(repository.softDeleteComment).toHaveBeenCalledWith(
      555n,
      expect.any(Date),
    );
  });
});
