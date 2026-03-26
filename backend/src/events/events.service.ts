import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  create(farmId: string, dto: CreateEventDto) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.pigEvent.create({
        data: {
          farmId,
          pigId: dto.pigId,
          type: dto.type as any,
          eventDate: dto.eventDate ? new Date(dto.eventDate) : new Date(),
          weightKg: dto.weightKg,
          medicine: dto.medicine,
          dose: dto.dose,
          cost: dto.cost,
          notes: dto.notes,
          boarId: dto.boarId,
          pigletsBorn: dto.pigletsBorn,
          stillBorn: dto.stillBorn,
          pregnancyCheckResult: dto.pregnancyCheckResult as any,
        },
      });

      if (dto.type === 'BREEDING') {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: {
            pregnancyStatus: 'NOT_PREGNANT',
          },
        });
      }

      if (dto.type === 'PREGNANCY_CHECK' && dto.pregnancyCheckResult) {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: {
            pregnancyStatus:
              dto.pregnancyCheckResult === 'PREGNANT'
                ? 'PREGNANT'
                : 'RETURNED_TO_HEAT',
          },
        });
      }

      if (dto.type === 'FARROWING') {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: {
            pregnancyStatus: 'NOT_PREGNANT',
          },
        });
      }

      return created;
    });
  }

  async bulkCreate(farmId: string, dto: CreateBulkEventDto) {
    let pigIds = dto.pigIds ?? [];

    if (dto.pigGroupId) {
      const pigsInGroup = await this.prisma.pig.findMany({
        where: {
          farmId,
          pigGroupId: dto.pigGroupId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      pigIds = pigsInGroup.map((p) => p.id);
    }

    if (!pigIds.length) {
      throw new Error('No pigs selected for bulk event');
    }

    const eventDate = dto.eventDate ? new Date(dto.eventDate) : new Date();

    const result = await this.prisma.$transaction(
      pigIds.map((pigId) =>
        this.prisma.pigEvent.create({
          data: {
            farmId,
            pigId,
            type: dto.type as any,
            eventDate,
            medicine: dto.medicine,
            dose: dto.dose,
            cost: dto.cost,
            notes: dto.notes,
          },
        }),
      ),
    );

    return {
      message: `Bulk event created for ${result.length} pigs`,
      count: result.length,
    };
  }

  list(farmId: string, pigId?: string) {
    return this.prisma.pigEvent.findMany({
      where: {
        farmId,
        ...(pigId ? { pigId } : {}),
      },
      orderBy: { eventDate: 'desc' },
    });
  }

  async update(farmId: string, eventId: string, dto: CreateEventDto) {
    const event = await this.prisma.pigEvent.findFirst({
      where: { id: eventId, farmId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pigEvent.update({
        where: { id: eventId },
        data: {
          type: dto.type as any,
          eventDate: dto.eventDate ? new Date(dto.eventDate) : event.eventDate,
          weightKg: dto.weightKg,
          medicine: dto.medicine,
          dose: dto.dose,
          cost: dto.cost,
          notes: dto.notes,
          boarId: dto.boarId,
          pigletsBorn: dto.pigletsBorn,
          stillBorn: dto.stillBorn,
          pregnancyCheckResult: dto.pregnancyCheckResult as any,
        },
      });

      if (dto.type === 'BREEDING') {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: {
            pregnancyStatus: 'NOT_PREGNANT',
          },
        });
      }

      if (dto.type === 'PREGNANCY_CHECK' && dto.pregnancyCheckResult) {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: {
            pregnancyStatus:
              dto.pregnancyCheckResult === 'PREGNANT'
                ? 'PREGNANT'
                : 'RETURNED_TO_HEAT',
          },
        });
      }

      if (dto.type === 'FARROWING') {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: {
            pregnancyStatus: 'NOT_PREGNANT',
          },
        });
      }

      return updated;
    });
  }

  async remove(farmId: string, eventId: string) {
    const event = await this.prisma.pigEvent.findFirst({
      where: { id: eventId, farmId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return this.prisma.pigEvent.delete({
      where: { id: eventId },
    });
  }
}