import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './room.controller';
import { RoomService } from '../../services/room/room.service';

describe('RoomController', () => {
  let controller: RoomController;

  const roomServiceMock: Partial<RoomService> = {
    createRoom: jest.fn(),
    listRooms: jest.fn(),
    getRoomDetail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [{ provide: RoomService, useValue: roomServiceMock }],
    }).compile();

    controller = module.get(RoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
