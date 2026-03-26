import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePigGroupDto } from './dto/create-pig-group.dto';
import { AssignPigsDto } from './dto/assign-pigs.dto';

@Injectable()
export class PigGroupsService {
  constructor(private prisma: PrismaService) {}

  create(farmId: string, dto: CreatePigGroupDto) {
    return this.prisma.pigGroup.create({
      data: {
        farmId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  list(farmId: string) {
    return this.prisma.pigGroup.findMany({
      where: { farmId },
      include: {
        pigs: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignPigs(farmId: string, groupId: string, dto: AssignPigsDto) {
    const group = await this.prisma.pigGroup.findFirst({
      where: { id: groupId, farmId },
    });

    if (!group) {
      throw new Error('Pig group not found');
    }

    await this.prisma.pig.updateMany({
      where: {
        id: { in: dto.pigIds },
        farmId,
      },
      data: {
        pigGroupId: groupId,
      },
    });

    return this.prisma.pigGroup.findFirst({
      where: { id: groupId, farmId },
      include: {
        pigs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async removePig(farmId: string, groupId: string, pigId: string) {
    const group = await this.prisma.pigGroup.findFirst({
      where: { id: groupId, farmId },
    });

    if (!group) {
      throw new Error('Pig group not found');
    }

    await this.prisma.pig.updateMany({
      where: {
        id: pigId,
        farmId,
        pigGroupId: groupId,
      },
      data: {
        pigGroupId: null,
      },
    });

    return { message: 'Pig removed from group' };
  }
}