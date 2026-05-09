import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException('Pig group not found');
    }

    if (!dto.pigIds || dto.pigIds.length === 0) {
      throw new BadRequestException('Please select at least one pig');
    }

    const pigs = await this.prisma.pig.findMany({
      where: {
        id: { in: dto.pigIds },
        farmId,
      },
      select: {
        id: true,
        tagNumber: true,
        pigGroupId: true,
        status: true,
      },
    });

    if (pigs.length !== dto.pigIds.length) {
      throw new BadRequestException('One or more selected pigs were not found');
    }

    const inactivePigs = pigs.filter((pig) => pig.status !== 'ACTIVE');
    if (inactivePigs.length > 0) {
      throw new BadRequestException(
        `Only active pigs can be assigned to a group. Problem pig(s): ${inactivePigs
          .map((pig) => pig.tagNumber)
          .join(', ')}`,
      );
    }

    const alreadyInAnotherGroup = pigs.filter(
      (pig) => pig.pigGroupId && pig.pigGroupId !== groupId,
    );

    if (alreadyInAnotherGroup.length > 0) {
      throw new BadRequestException(
        `These pig(s) are already in another group and must be removed first: ${alreadyInAnotherGroup
          .map((pig) => pig.tagNumber)
          .join(', ')}`,
      );
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
      throw new NotFoundException('Pig group not found');
    }

    const pig = await this.prisma.pig.findFirst({
      where: {
        id: pigId,
        farmId,
      },
      select: {
        id: true,
        pigGroupId: true,
        tagNumber: true,
      },
    });

    if (!pig) {
      throw new NotFoundException('Pig not found');
    }

    if (pig.pigGroupId !== groupId) {
      throw new BadRequestException(`Pig ${pig.tagNumber} is not in this group`);
    }

    await this.prisma.pig.update({
      where: { id: pigId },
      data: { pigGroupId: null },
    });

    return { message: 'Pig removed from group' };
  }

  async remove(farmId: string, groupId: string) {
    const group = await this.prisma.pigGroup.findFirst({
      where: { id: groupId, farmId },
    });

    if (!group) {
      throw new NotFoundException('Pig group not found');
    }

    await this.prisma.pigGroup.delete({
      where: { id: groupId },
    });
  }
}
