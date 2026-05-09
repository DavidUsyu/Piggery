import { Injectable } from '@nestjs/common';
import { PigEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private getExpenseCategoryFromEventType(type: string): 'MEDICINE' | null {
    if (type === 'VACCINATION') return 'MEDICINE';
    if (type === 'DEWORMING') return 'MEDICINE';
    if (type === 'TREATMENT') return 'MEDICINE';
    if (type === 'IRON_INJECTION') return 'MEDICINE';
    if (type === 'CASTRATION') return 'MEDICINE';
    return null;
  }

  private async syncFinanceForEvent(
    tx: any,
    farmId: string,
    event: {
      id: string;
      pigId: string;
      type: string;
      eventDate: Date;
      cost: number | null;
      medicine?: string | null;
      notes?: string | null;
    },
  ) {
    const existingExpense = await tx.expense.findUnique({
      where: { eventId: event.id },
    });

    if (event.type === 'SALE') {
      const existingSale = await tx.sale.findFirst({
        where: {
          farmId,
          pigId: event.pigId,
          saleDate: event.eventDate,
        },
      });

      if ((event.cost ?? 0) > 0) {
        if (existingSale) {
          await tx.sale.update({
            where: { id: existingSale.id },
            data: {
              unitPrice: event.cost,
              totalAmount: event.cost,
              notes: event.notes ?? existingSale.notes,
            },
          });
        } else {
          await tx.sale.create({
            data: {
              farmId,
              pigId: event.pigId,
              quantity: 1,
              unitPrice: event.cost!,
              totalAmount: event.cost!,
              saleDate: event.eventDate,
              notes: event.notes ?? 'Auto-created from sale event',
            },
          });
        }
      }

      if (existingExpense) {
        await tx.expense.delete({
          where: { id: existingExpense.id },
        });
      }

      return;
    }

    const expenseCategory = this.getExpenseCategoryFromEventType(event.type);

    if (!expenseCategory || !event.cost || event.cost <= 0) {
      if (existingExpense) {
        await tx.expense.delete({
          where: { id: existingExpense.id },
        });
      }
      return;
    }

    const description =
      event.notes ||
      (event.medicine
        ? `${event.type} - ${event.medicine}`
        : `${event.type} event cost`);

    if (existingExpense) {
      await tx.expense.update({
        where: { id: existingExpense.id },
        data: {
          pigId: event.pigId,
          category: expenseCategory,
          amount: event.cost,
          expenseDate: event.eventDate,
          description,
        },
      });
    } else {
      await tx.expense.create({
        data: {
          farmId,
          pigId: event.pigId,
          eventId: event.id,
          category: expenseCategory,
          amount: event.cost,
          expenseDate: event.eventDate,
          description,
        },
      });
    }
  }

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
          data: { pregnancyStatus: 'NOT_PREGNANT' },
        });
      }

      if (dto.type === 'PREGNANCY_CHECK' && dto.pregnancyCheckResult) {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: {
            pregnancyStatus:
              dto.pregnancyCheckResult === 'PREGNANT'
                ? 'PREGNANT'
                : dto.pregnancyCheckResult === 'RETURNED_TO_HEAT'
                  ? 'RETURNED_TO_HEAT'
                  : 'NOT_PREGNANT',
          },
        });
      }

      if (dto.type === 'FARROWING') {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: { pregnancyStatus: 'NOT_PREGNANT' },
        });
      }

      if (dto.type === 'SALE') {
        await tx.pig.update({
          where: { id: dto.pigId },
          data: { status: 'SOLD' },
        });
      }

      await this.syncFinanceForEvent(tx, farmId, created);

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

    // IMPORTANT:
    // In bulk events, the entered cost is treated as TOTAL SHARED COST
    // for the whole selected group, not cost per pig.
    const totalSharedCost = dto.cost ?? null;
    const perPigCost =
      totalSharedCost && pigIds.length > 0
        ? Number((totalSharedCost / pigIds.length).toFixed(2))
        : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const createdEvents: PigEvent[] = [];

      for (const pigId of pigIds) {
        const created = await tx.pigEvent.create({
          data: {
            farmId,
            pigId,
            type: dto.type as any,
            eventDate,
            medicine: dto.medicine,
            dose: dto.dose,
            cost: perPigCost,
            notes:
              dto.notes ||
              (totalSharedCost
                ? `Bulk ${dto.type.toLowerCase()} event. Shared total cost KES ${totalSharedCost} across ${pigIds.length} pig(s).`
                : undefined),
          },
        });

        await this.syncFinanceForEvent(tx, farmId, created);
        createdEvents.push(created);
      }

      return createdEvents;
    });

    return {
      message: `Bulk event created for ${result.length} pigs`,
      count: result.length,
      totalSharedCost,
      perPigCost,
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
          data: { pregnancyStatus: 'NOT_PREGNANT' },
        });
      }

      if (dto.type === 'PREGNANCY_CHECK' && dto.pregnancyCheckResult) {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: {
            pregnancyStatus:
              dto.pregnancyCheckResult === 'PREGNANT'
                ? 'PREGNANT'
                : dto.pregnancyCheckResult === 'RETURNED_TO_HEAT'
                  ? 'RETURNED_TO_HEAT'
                  : 'NOT_PREGNANT',
          },
        });
      }

      if (dto.type === 'FARROWING') {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: { pregnancyStatus: 'NOT_PREGNANT' },
        });
      }

      if (dto.type === 'SALE') {
        await tx.pig.update({
          where: { id: updated.pigId },
          data: { status: 'SOLD' },
        });
      }

      await this.syncFinanceForEvent(tx, farmId, updated);

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

    return this.prisma.$transaction(async (tx) => {
      const linkedExpense = await tx.expense.findUnique({
        where: { eventId },
      });

      if (linkedExpense) {
        await tx.expense.delete({
          where: { id: linkedExpense.id },
        });
      }

      const linkedSale = await tx.sale.findFirst({
        where: {
          farmId,
          pigId: event.pigId,
          saleDate: event.eventDate,
        },
      });

      if (event.type === 'SALE' && linkedSale) {
        await tx.sale.delete({
          where: { id: linkedSale.id },
        });

        await tx.pig.update({
          where: { id: event.pigId },
          data: { status: 'ACTIVE' },
        });
      }

      return tx.pigEvent.delete({
        where: { id: eventId },
      });
    });
  }
}
