import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PigsController } from './pigs.controller';
import { PigsService } from './pigs.service';

describe('PigsController', () => {
  let controller: PigsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PigsController],
      providers: [
        {
          provide: PigsService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PigsController>(PigsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
