import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PigsService } from './pigs.service';

describe('PigsService', () => {
  let service: PigsService;
  let prisma: {
    pig: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    pigEvent: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      pig: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pigEvent: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PigsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PigsService>(PigsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creating a pig with a tag number already used in the farm', async () => {
    prisma.pig.findFirst.mockResolvedValue({ id: 'pig-1' });

    await expect(
      service.create('farm-1', {
        tagNumber: 'A-001',
        sex: 'FEMALE',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.pig.create).not.toHaveBeenCalled();
  });

  it('creates a pig when the tag number is not already used', async () => {
    const createdPig = { id: 'pig-1', tagNumber: 'A-001' };
    prisma.pig.findFirst.mockResolvedValue(null);
    prisma.pig.create.mockResolvedValue(createdPig);

    await expect(
      service.create('farm-1', {
        tagNumber: 'A-001',
        sex: 'FEMALE',
      }),
    ).resolves.toBe(createdPig);

    expect(prisma.pig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        farmId: 'farm-1',
        tagNumber: 'A-001',
      }),
    });
  });

  it('deletes a pig that belongs to the farm', async () => {
    prisma.pig.findFirst.mockResolvedValue({ id: 'pig-1', farmId: 'farm-1' });
    prisma.pig.delete.mockResolvedValue({ id: 'pig-1' });

    await expect(service.remove('farm-1', 'pig-1')).resolves.toBeUndefined();

    expect(prisma.pig.delete).toHaveBeenCalledWith({
      where: { id: 'pig-1' },
    });
  });

  it('does not delete a pig outside the farm', async () => {
    prisma.pig.findFirst.mockResolvedValue(null);

    await expect(service.remove('farm-1', 'pig-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.pig.delete).not.toHaveBeenCalled();
  });
});
