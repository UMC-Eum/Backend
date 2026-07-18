import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { FcmPushService } from '../../push/services/fcm-push.service';

describe('NotificationService', () => {
  let service: NotificationService;
  const repositoryMock = {
    createNotification: jest.fn(),
    markAsRead: jest.fn(),
    findAll: jest.fn(),
    readAllClubNotifications: jest.fn(),
  };
  const fcmPushServiceMock = {
    sendNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: repositoryMock },
        { provide: FcmPushService, useValue: fcmPushServiceMock },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('marks all club notifications as read', async () => {
    await service.readAllClubNotifications(1);

    expect(repositoryMock.readAllClubNotifications).toHaveBeenCalledWith(1);
  });
});
