import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedTypeDto } from './dto/create-feed-type.dto';
import { CreateFeedPurchaseDto } from './dto/create-feed-purchase.dto';
import { CreateFeedUsageDto } from './dto/create-feed-usage.dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  /* =========================
     FEED TYPES
  ========================= */

  async createFeedType(farmId: string, dto: CreateFeedTypeDto) {
    const name = dto.name.trim();
    const unit = (dto.unit || 'kg').trim();

    const existing = await this.prisma.feedType.findFirst({
      where: { farmId, name },
    });

    if (existing) {
      throw new Error('A feed type with this name already exists');
    }

    return this.prisma.feedType.create({
      data: {
        farmId,
        name,
        description: dto.description?.trim() || undefined,
        unit,
      },
    });
  }

  listFeedTypes(farmId: string) {
    return this.prisma.feedType.findMany({
      where: { farmId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* =========================
     FEED PURCHASE (STOCK IN + FINANCE EXPENSE)
  ========================= */

  async createFeedPurchase(farmId: string, dto: CreateFeedPurchaseDto) {
    const feedType = await this.prisma.feedType.findFirst({
      where: {
        id: dto.feedTypeId,
        farmId,
      },
    });

    if (!feedType) {
      throw new Error('Feed type not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.feedPurchase.create({
        data: {
          farmId,
          feedTypeId: dto.feedTypeId,
          quantityBought: dto.quantityBought,
          quantityLeft: dto.quantityBought,
          totalCost: dto.totalCost,
          purchaseDate: dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : new Date(),
          notes: dto.notes || undefined,
        },
        include: {
          feedType: true,
        },
      });

      await tx.expense.create({
        data: {
          farmId,
          category: 'FEED',
          amount: dto.totalCost,
          expenseDate: dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : new Date(),
          description: `Feed purchase - ${feedType.name} (${dto.quantityBought} ${feedType.unit})`,
        },
      });

      return purchase;
    });
  }

  listFeedPurchases(farmId: string) {
    return this.prisma.feedPurchase.findMany({
      where: { farmId },
      include: { feedType: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  /* =========================
     FEED USAGE (STOCK OUT)
  ========================= */

  async recordFeedUsage(farmId: string, dto: CreateFeedUsageDto) {
    const purchases = await this.prisma.feedPurchase.findMany({
      where: {
        farmId,
        feedTypeId: dto.feedTypeId,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (purchases.length === 0) {
      throw new Error('No feed stock found for this type');
    }

    const used = Number(dto.quantityUsed);

    if (Number.isNaN(used) || used <= 0) {
      throw new Error('Quantity used must be greater than zero');
    }

    const totalLeft = purchases.reduce(
      (sum, purchase) => sum + Number(purchase.quantityLeft),
      0,
    );

    if (used > totalLeft) {
      throw new Error('Not enough feed in stock');
    }

    let remainingToDeduct = used;

    for (const purchase of purchases) {
      if (remainingToDeduct <= 0) break;

      const currentLeft = Number(purchase.quantityLeft);

      if (currentLeft <= 0) continue;

      const deduction = Math.min(currentLeft, remainingToDeduct);
      const updatedLeft = Number((currentLeft - deduction).toFixed(2));

      await this.prisma.feedPurchase.update({
        where: { id: purchase.id },
        data: {
          quantityLeft: updatedLeft,
        },
      });

      remainingToDeduct = Number((remainingToDeduct - deduction).toFixed(2));
    }

    return this.prisma.feedUsage.create({
      data: {
        farmId,
        feedTypeId: dto.feedTypeId,
        quantityUsed: used,
        usageDate: dto.usageDate ? new Date(dto.usageDate) : new Date(),
        notes: dto.notes || undefined,
      },
      include: {
        feedType: true,
      },
    });
  }
}