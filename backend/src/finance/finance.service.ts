import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async createSale(farmId: string, dto: CreateSaleDto) {
    if (dto.pigId) {
      const pig = await this.prisma.pig.findFirst({
        where: { id: dto.pigId, farmId },
      });

      if (!pig) {
        throw new NotFoundException('Pig not found');
      }
    }

    const quantity = dto.quantity ?? 1;
    const totalAmount = quantity * dto.unitPrice;

    const sale = await this.prisma.sale.create({
      data: {
        farmId,
        pigId: dto.pigId,
        quantity,
        unitPrice: dto.unitPrice,
        totalAmount,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        buyerName: dto.buyerName,
        notes: dto.notes,
      },
      include: {
        pig: true,
      },
    });

    if (dto.pigId) {
      await this.prisma.pigEvent.create({
        data: {
          farmId,
          pigId: dto.pigId,
          type: 'SALE',
          eventDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
          cost: totalAmount,
          notes:
            dto.notes ??
            `Pig sold to ${dto.buyerName ?? 'buyer'} for ${totalAmount}`,
        },
      });

      await this.prisma.pig.update({
        where: { id: dto.pigId },
        data: { status: 'SOLD' },
      });
    }

    return sale;
  }

  async listSales(farmId: string) {
    return this.prisma.sale.findMany({
      where: { farmId },
      include: { pig: true },
      orderBy: { saleDate: 'desc' },
    });
  }

  async updateSale(farmId: string, saleId: string, dto: UpdateSaleDto) {
    const existing = await this.prisma.sale.findFirst({
      where: { id: saleId, farmId },
    });

    if (!existing) {
      throw new NotFoundException('Sale not found');
    }

    if (dto.pigId) {
      const pig = await this.prisma.pig.findFirst({
        where: { id: dto.pigId, farmId },
      });

      if (!pig) {
        throw new NotFoundException('Pig not found');
      }
    }

    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? existing.unitPrice;
    const totalAmount = quantity * unitPrice;

    return this.prisma.sale.update({
      where: { id: saleId },
      data: {
        pigId: dto.pigId ?? existing.pigId,
        quantity,
        unitPrice,
        totalAmount,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : existing.saleDate,
        buyerName: dto.buyerName ?? existing.buyerName,
        notes: dto.notes ?? existing.notes,
      },
      include: { pig: true },
    });
  }

  async deleteSale(farmId: string, saleId: string) {
    const existing = await this.prisma.sale.findFirst({
      where: { id: saleId, farmId },
    });

    if (!existing) {
      throw new NotFoundException('Sale not found');
    }

    return this.prisma.sale.delete({
      where: { id: saleId },
    });
  }

  async createExpense(farmId: string, dto: CreateExpenseDto) {
    if (dto.pigId) {
      const pig = await this.prisma.pig.findFirst({
        where: { id: dto.pigId, farmId },
      });

      if (!pig) {
        throw new NotFoundException('Pig not found');
      }
    }

    return this.prisma.expense.create({
      data: {
        farmId,
        pigId: dto.pigId,
        category: dto.category,
        amount: dto.amount,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        description: dto.description,
        vendor: dto.vendor,
      },
      include: {
        pig: true,
      },
    });
  }

  async listExpenses(farmId: string) {
    return this.prisma.expense.findMany({
      where: { farmId },
      include: { pig: true, event: true },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async updateExpense(farmId: string, expenseId: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, farmId },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    if (dto.pigId) {
      const pig = await this.prisma.pig.findFirst({
        where: { id: dto.pigId, farmId },
      });

      if (!pig) {
        throw new NotFoundException('Pig not found');
      }
    }

    return this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        pigId: dto.pigId ?? existing.pigId,
        category: dto.category ?? existing.category,
        amount: dto.amount ?? existing.amount,
        expenseDate: dto.expenseDate
          ? new Date(dto.expenseDate)
          : existing.expenseDate,
        description: dto.description ?? existing.description,
        vendor: dto.vendor ?? existing.vendor,
      },
      include: { pig: true },
    });
  }

  async deleteExpense(farmId: string, expenseId: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, farmId },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.delete({
      where: { id: expenseId },
    });
  }

  async summary(farmId: string, from?: string, to?: string) {
    const dateFilter =
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined,
          }
        : undefined;

    const [salesAgg, expenseAgg, salesByCategory, expensesByCategory] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            farmId,
            ...(dateFilter ? { saleDate: dateFilter } : {}),
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: {
            farmId,
            ...(dateFilter ? { expenseDate: dateFilter } : {}),
          },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.sale.findMany({
          where: {
            farmId,
            ...(dateFilter ? { saleDate: dateFilter } : {}),
          },
          orderBy: { saleDate: 'desc' },
          take: 5,
          include: { pig: true },
        }),
        this.prisma.expense.groupBy({
          by: ['category'],
          where: {
            farmId,
            ...(dateFilter ? { expenseDate: dateFilter } : {}),
          },
          _sum: { amount: true },
          orderBy: {
            category: 'asc',
          },
        }),
      ]);

    const totalRevenue = salesAgg._sum.totalAmount ?? 0;
    const totalExpenses = expenseAgg._sum.amount ?? 0;
    const netProfit = totalRevenue - totalExpenses;

    const status =
      netProfit > 0 ? 'PROFIT' : netProfit < 0 ? 'LOSS' : 'BREAK_EVEN';

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      status,
      saleCount: salesAgg._count,
      expenseCount: expenseAgg._count,
      recentSales: salesByCategory,
      expenseBreakdown: expensesByCategory.map((item) => ({
        category: item.category,
        amount: item._sum.amount ?? 0,
      })),
    };
  }

  async pigProfit(farmId: string, pigId: string) {
    const pig = await this.prisma.pig.findFirst({
      where: { id: pigId, farmId },
    });

    if (!pig) {
      throw new NotFoundException('Pig not found');
    }

    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { farmId, pigId },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { farmId, pigId },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = salesAgg._sum.totalAmount ?? 0;
    const totalExpenses = expensesAgg._sum.amount ?? 0;
    const netProfit = totalRevenue - totalExpenses;

    return {
      pigId: pig.id,
      tagNumber: pig.tagNumber,
      totalRevenue,
      totalExpenses,
      netProfit,
      status:
        netProfit > 0 ? 'PROFIT' : netProfit < 0 ? 'LOSS' : 'BREAK_EVEN',
    };
  }
}