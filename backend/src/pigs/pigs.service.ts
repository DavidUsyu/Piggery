import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePigDto } from './dto/create-pig.dto';
import { UpdatePigDto } from './dto/update-pig.dto';
import { UpdatePigStatusDto } from './dto/update-pig-status.dto';

@Injectable()
export class PigsService {
  constructor(private prisma: PrismaService) {}

  create(farmId: string, dto: CreatePigDto) {
    return this.prisma.pig.create({
      data: {
        farmId,
        tagNumber: dto.tagNumber,
        name: dto.name,
        sex: dto.sex as any,
        breed: dto.breed,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        sireId: dto.sireId,
        damId: dto.damId,
      },
    });
  }

  async list(farmId: string) {
    const pigs = await this.prisma.pig.findMany({
      where: { farmId },
      include: {
        events: {
          orderBy: { eventDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pigs.map((pig) => {
      const lastBreeding = pig.events
        .filter((e) => e.type === 'BREEDING')
        .sort(
          (a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
        )[0];

      let expectedFarrowingDate: Date | null = null;
      let farrowingDaysLeft: number | null = null;

      if (
        pig.sex === 'FEMALE' &&
        pig.pregnancyStatus === 'PREGNANT' &&
        lastBreeding
      ) {
        expectedFarrowingDate = new Date(lastBreeding.eventDate);
        expectedFarrowingDate.setDate(expectedFarrowingDate.getDate() + 114);

        farrowingDaysLeft = Math.ceil(
          (expectedFarrowingDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
      }

      return {
        id: pig.id,
        tagNumber: pig.tagNumber,
        name: pig.name,
        sex: pig.sex,
        breed: pig.breed,
        birthDate: pig.birthDate,
        status: pig.status,
        pregnancyStatus: pig.pregnancyStatus,
        expectedFarrowingDate,
        farrowingDaysLeft,
      };
    });
  }

  async findOne(farmId: string, pigId: string) {
    const pig = await this.prisma.pig.findFirst({
      where: { id: pigId, farmId },
    });

    if (!pig) {
      throw new Error('Pig not found');
    }

    return pig;
  }

  async update(farmId: string, pigId: string, dto: UpdatePigDto) {
    const pig = await this.prisma.pig.findFirst({
      where: { id: pigId, farmId },
    });

    if (!pig) {
      throw new Error('Pig not found');
    }

    if (dto.tagNumber && dto.tagNumber !== pig.tagNumber) {
      const existingTag = await this.prisma.pig.findFirst({
        where: {
          farmId,
          tagNumber: dto.tagNumber,
          id: { not: pigId },
        },
      });

      if (existingTag) {
        throw new Error('Another pig already uses this tag number');
      }
    }

    return this.prisma.pig.update({
      where: { id: pigId },
      data: {
        tagNumber: dto.tagNumber ?? pig.tagNumber,
        name: dto.name !== undefined ? dto.name : pig.name,
        sex: (dto.sex as any) ?? pig.sex,
        breed: dto.breed !== undefined ? dto.breed : pig.breed,
        birthDate:
          dto.birthDate !== undefined
            ? dto.birthDate
              ? new Date(dto.birthDate)
              : null
            : pig.birthDate,
        sireId: dto.sireId !== undefined ? dto.sireId : pig.sireId,
        damId: dto.damId !== undefined ? dto.damId : pig.damId,
      },
    });
  }

  async updateStatus(
    farmId: string,
    pigId: string,
    dto: UpdatePigStatusDto,
  ) {
    const pig = await this.prisma.pig.findFirst({
      where: { id: pigId, farmId },
    });

    if (!pig) {
      throw new Error('Pig not found');
    }

    const updatedPig = await this.prisma.pig.update({
      where: { id: pigId },
      data: { status: dto.status as any },
    });

    const eventType =
      dto.status === 'SOLD'
        ? 'SALE'
        : dto.status === 'DEAD'
          ? 'DEATH'
          : 'CONSUMED';

    await this.prisma.pigEvent.create({
      data: {
        farmId,
        pigId,
        type: eventType as any,
        eventDate: new Date(),
        notes:
          dto.notes ||
          `Pig marked as ${dto.status.toLowerCase()} from pig profile page`,
      },
    });

    return updatedPig;
  }

  async timeline(farmId: string, pigId: string) {
    const pig = await this.prisma.pig.findFirst({
      where: { id: pigId, farmId },
      include: {
        events: {
          orderBy: { eventDate: 'desc' },
        },
      },
    });

    if (!pig) {
      throw new Error('Pig not found');
    }

    const ageDays = pig.birthDate
      ? Math.floor((Date.now() - pig.birthDate.getTime()) / 86400000)
      : 0;

    const stage =
      ageDays <= 35
        ? 'PIGLET'
        : ageDays <= 70
          ? 'WEANER'
          : ageDays <= 140
            ? 'GROWER'
            : ageDays <= 180
              ? 'FINISHER'
              : 'ADULT';

    const lastWeight = pig.events.find((e) => e.type === 'WEIGHT');

    const recommendations: string[] = [];

    if (pig.status === 'ACTIVE') {
      if (stage === 'PIGLET') {
        recommendations.push(
          'Plan weaning around 6–8 weeks (add a WEANING event when done).',
          'Record deworming schedule (add DEWORMING events).',
          'Record vaccinations (add VACCINATION events).',
        );
      }

      if (stage === 'WEANER') {
        recommendations.push(
          'Monitor feed transition carefully.',
          'Track weight regularly to confirm healthy growth.',
        );
      }

      if (stage === 'GROWER') {
        recommendations.push(
          'Maintain regular weight checks and feeding plan.',
        );
      }

      if (stage === 'FINISHER') {
        recommendations.push(
          'Prepare for market planning or breeding decisions.',
        );
      }

      if (stage === 'ADULT' && pig.sex === 'FEMALE') {
        recommendations.push(
          'Monitor reproductive cycle and record breeding events when applicable.',
        );
      }
    }

    const lastBreeding = pig.events
      .filter((e) => e.type === 'BREEDING')
      .sort(
        (a, b) =>
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      )[0];

    let expectedFarrowingDate: Date | null = null;
    let farrowingDaysLeft: number | null = null;

    if (
      pig.sex === 'FEMALE' &&
      pig.pregnancyStatus === 'PREGNANT' &&
      lastBreeding
    ) {
      expectedFarrowingDate = new Date(lastBreeding.eventDate);
      expectedFarrowingDate.setDate(expectedFarrowingDate.getDate() + 114);

      farrowingDaysLeft = Math.ceil(
        (expectedFarrowingDate.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
    }

    return {
      pigId: pig.id,
      tagNumber: pig.tagNumber,
      name: pig.name,
      breed: pig.breed,
      birthDate: pig.birthDate,
      sex: pig.sex,
      status: pig.status,
      pregnancyStatus: pig.pregnancyStatus,
      expectedFarrowingDate,
      farrowingDaysLeft,
      stage,
      ageDays,
      lastWeight: lastWeight
        ? {
            weightKg: lastWeight.weightKg,
            eventDate: lastWeight.eventDate,
          }
        : null,
      recommendations,
    };
  }
}