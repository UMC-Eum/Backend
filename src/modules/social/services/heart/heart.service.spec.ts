import { Test, TestingModule } from '@nestjs/testing';
import { HeartService } from './heart.service';
import { HeartRepository } from '../../repositories/heart.repository';
import { NotificationService } from '../../../notification/services/notification.service';
import { UserService } from '../../../user/services/user/user.service';
import { AppException } from '../../../../common/errors/app.exception';

describe('HeartService', () => {
  let service: HeartService;

  const postHeart = jest.fn();
  const patchHeart = jest.fn();
  const getReceivedHeartsByUserId = jest.fn();
  const getSentHeartsByUserId = jest.fn();
  const createNotification = jest.fn();
  const getMe = jest.fn();
  const getDetailedProfile = jest.fn();

  const profile = {
    id: 174,
    nickname: 'sender',
    birthdate: '1970-01-01T00:00:00.000Z',
    profileImageUrl: null,
    introText: null,
    introVoiceUrl: null,
    address: { fullName: '서울시 강남구' },
    interests: [],
    personalities: [],
  };
  const deletedUserProfile = {
    id: 0,
    nickname: '삭제된 사용자',
    birthdate: '',
    profileImageUrl: null,
    introText: null,
    introVoiceUrl: null,
    address: { fullName: '' },
    interests: [],
    personalities: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeartService,
        {
          provide: HeartRepository,
          useValue: {
            postHeart,
            patchHeart,
            getReceivedHeartsByUserId,
            getSentHeartsByUserId,
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createNotification,
          },
        },
        {
          provide: UserService,
          useValue: {
            getMe,
            getDetailedProfile,
          },
        },
      ],
    }).compile();

    service = module.get<HeartService>(HeartService);
    getMe.mockResolvedValue({ nickname: 'TestUser' });
    createNotification.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createHeart', () => {
    it('로그인 유저가 대상 유저에게 하트를 보내면 repository와 알림을 호출한다', async () => {
      postHeart.mockResolvedValue({
        ok: true,
        heart: {
          heartId: 101,
          createdAt: '2026-07-04T00:00:00.000Z',
        },
      });

      await expect(service.createHeart('7', '24')).resolves.toEqual({
        heartId: 101,
        createdAt: '2026-07-04T00:00:00.000Z',
      });

      expect(postHeart).toHaveBeenCalledWith('7', '24');
      expect(createNotification).toHaveBeenCalledWith(
        24,
        'HEART',
        '마음을 누른 사람이 생겼습니다!',
        'TestUser님이 회원님에게 마음을 보냈습니다.',
        7,
        {
          senderUserId: '7',
          heartId: '101',
        },
      );
    });

    it('sentToId가 없거나 유효하지 않으면 validation 에러를 던진다', async () => {
      await expect(service.createHeart('7', '0')).rejects.toMatchObject({
        internalCode: 'VALIDATION_INVALID_FORMAT',
      });
      expect(postHeart).not.toHaveBeenCalled();
    });

    it('자기 자신에게 하트를 보낼 수 없다', async () => {
      await expect(service.createHeart('7', '7')).rejects.toMatchObject({
        internalCode: 'VALIDATION_INVALID_FORMAT',
      });
      expect(postHeart).not.toHaveBeenCalled();
    });

    it('존재하지 않거나 삭제/비활성인 유저에게 하트를 보낼 수 없다', async () => {
      postHeart.mockResolvedValue({
        ok: false,
        reason: 'TARGET_NOT_FOUND',
      });

      await expect(service.createHeart('7', '24')).rejects.toMatchObject({
        internalCode: 'SOCIAL_TARGET_USER_NOT_FOUND',
      });
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('같은 유저에게 ACTIVE Heart를 중복으로 보낼 수 없다', async () => {
      postHeart.mockResolvedValue({
        ok: false,
        reason: 'ALREADY_EXISTS',
      });

      await expect(service.createHeart('7', '24')).rejects.toMatchObject({
        internalCode: 'SOCIAL_HEART_ALREADY_EXISTS',
      });
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getReceivedHearts', () => {
    it('정상 Heart row는 기존 응답 포맷대로 내려간다', async () => {
      getReceivedHeartsByUserId.mockResolvedValue({
        nextCursor: null,
        items: [
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
          },
        ],
      });
      getDetailedProfile.mockResolvedValue(profile);

      await expect(
        service.getReceivedHearts({
          userId: '11',
          path: '/api/v1/hearts/received',
        }),
      ).resolves.toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
            fromUser: profile,
          },
        ],
      });
    });

    it('sentById가 null인 Heart row는 삭제된 사용자 placeholder로 반환한다', async () => {
      getReceivedHeartsByUserId.mockResolvedValue({
        nextCursor: null,
        items: [
          {
            heartId: 29,
            createdAt: '2026-07-04T02:50:18.949Z',
            fromUserId: null,
          },
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
          },
        ],
      });
      getDetailedProfile.mockResolvedValue(profile);

      await expect(
        service.getReceivedHearts({
          userId: '11',
          path: '/api/v1/hearts/received',
        }),
      ).resolves.toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 29,
            createdAt: '2026-07-04T02:50:18.949Z',
            fromUserId: null,
            fromUser: deletedUserProfile,
          },
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
            fromUser: profile,
          },
        ],
      });
      expect(getDetailedProfile).toHaveBeenCalledTimes(1);
      expect(getDetailedProfile).toHaveBeenCalledWith(174);
    });

    it('보낸 유저 프로필 조회가 실패해도 인증 오류로 전체 실패하지 않는다', async () => {
      getReceivedHeartsByUserId.mockResolvedValue({
        nextCursor: null,
        items: [
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
          },
        ],
      });
      getDetailedProfile.mockRejectedValue(
        new AppException('AUTH_LOGIN_REQUIRED'),
      );

      await expect(
        service.getReceivedHearts({
          userId: '11',
          path: '/api/v1/hearts/received',
        }),
      ).resolves.toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 24,
            createdAt: '2026-07-04T02:08:32.165Z',
            fromUserId: 174,
            fromUser: deletedUserProfile,
          },
        ],
      });
    });
  });

  describe('getSentHearts', () => {
    it('sentToId가 null인 Heart row는 삭제된 사용자 placeholder로 반환한다', async () => {
      getSentHeartsByUserId.mockResolvedValue({
        nextCursor: null,
        items: [
          {
            heartId: 30,
            createdAt: '2026-07-04T02:52:31.680Z',
            targetUserId: null,
          },
        ],
      });

      await expect(
        service.getSentHearts({
          userId: '174',
          path: '/api/v1/hearts/sent',
        }),
      ).resolves.toEqual({
        nextCursor: null,
        items: [
          {
            heartId: 30,
            createdAt: '2026-07-04T02:52:31.680Z',
            targetUserId: null,
            targetUser: deletedUserProfile,
          },
        ],
      });
      expect(getDetailedProfile).not.toHaveBeenCalled();
    });
  });
});
