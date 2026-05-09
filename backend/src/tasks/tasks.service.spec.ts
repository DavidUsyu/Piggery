import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    pig: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      pig: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates day 3 piglet care tasks when they have not been recorded', async () => {
    prisma.pig.findMany.mockResolvedValue([
      {
        id: 'pig-1',
        tagNumber: 'A001',
        sex: 'MALE',
        birthDate: daysAgo(4),
        events: [],
      },
    ]);

    const tasks = await service.dueForFarm('farm-1');
    const taskTypes = tasks.map((task) => task.task);

    expect(taskTypes).toContain('TEETH_CLIPPING');
    expect(taskTypes).toContain('TAIL_DOCKING');
  });

  it('creates day 21 castration and iron injection tasks when they have not been recorded', async () => {
    prisma.pig.findMany.mockResolvedValue([
      {
        id: 'pig-1',
        tagNumber: 'A001',
        sex: 'MALE',
        birthDate: daysAgo(22),
        events: [
          { type: 'TEETH_CLIPPING', eventDate: daysAgo(19) },
          { type: 'TAIL_DOCKING', eventDate: daysAgo(19) },
        ],
      },
    ]);

    const tasks = await service.dueForFarm('farm-1');
    const taskTypes = tasks.map((task) => task.task);

    expect(taskTypes).toContain('CASTRATION');
    expect(taskTypes).toContain('IRON_INJECTION');
    expect(
      tasks.find((task) => task.task === 'IRON_INJECTION')?.reason,
    ).toContain('2ml');
  });

  it('uses the 56, 91, and 126 day deworming schedule', async () => {
    prisma.pig.findMany.mockResolvedValue([
      {
        id: 'pig-1',
        tagNumber: 'A001',
        sex: 'MALE',
        birthDate: daysAgo(92),
        events: [
          { type: 'TEETH_CLIPPING', eventDate: daysAgo(89) },
          { type: 'TAIL_DOCKING', eventDate: daysAgo(89) },
          { type: 'CASTRATION', eventDate: daysAgo(71) },
          { type: 'IRON_INJECTION', eventDate: daysAgo(71) },
          { type: 'DEWORMING', eventDate: daysAgo(36) },
        ],
      },
    ]);

    const tasks = await service.dueForFarm('farm-1');

    expect(tasks).toContainEqual(
      expect.objectContaining({
        task: 'DEWORMING',
        reason: expect.stringContaining('day 91'),
      }),
    );
  });
});
