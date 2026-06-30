import { AppException } from '../../../common/errors/app.exception';
import { OnboardingController } from './onboarding.controller';

jest.mock('../services/onboarding.service', () => ({
  OnboardingService: class OnboardingService {},
}));

jest.mock(
  'src/modules/auth/decorators',
  () => ({
    RequiredUserId: () => () => undefined,
  }),
  { virtual: true },
);

jest.mock(
  'src/modules/auth/guards/access-token.guard',
  () => ({
    AccessTokenGuard: class AccessTokenGuard {},
  }),
  { virtual: true },
);

describe('OnboardingController', () => {
  const dto = {
    nickname: '루씨',
    gender: 'F',
    birthDate: '1972-03-01',
    areaCode: '1168000000',
    introText: '안녕하세요',
    introAudioUrl: 'https://cdn.example.com/intro.m4a',
  };

  function createController(service: {
    createUserProfile: jest.Mock;
  }): OnboardingController {
    return new OnboardingController(service as never);
  }

  it('preserves AppException from createUserProfile', async () => {
    const error = new AppException('NETWORK_CONNECTION_FAILED');
    const controller = createController({
      createUserProfile: jest.fn().mockRejectedValue(error),
    });

    await expect(controller.createUserProfile(1, dto)).rejects.toBe(error);
  });

  it('wraps unexpected errors as PROFILE_NOT_REGISTERED', async () => {
    const controller = createController({
      createUserProfile: jest.fn().mockRejectedValue(new Error('db failed')),
    });

    await expect(controller.createUserProfile(1, dto)).rejects.toMatchObject({
      internalCode: 'PROFILE_NOT_REGISTERED',
    });
  });
});
