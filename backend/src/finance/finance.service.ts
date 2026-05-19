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
    const selectedPigIds = [
      ...new Set(dto.pigIds?.length ? dto.pigIds : dto.pigId ? [dto.pigId] : []),
    ];
    const saleDate = dto.saleDate ? new Date(dto.saleDate) : new Date();

    if (selectedPigIds.length) {
      const pigs = await this.prisma.pig.findMany({
        where: {
          id: { in: selectedPigIds },
          farmId,
          status: 'ACTIVE',
        },
      });

      if (pigs.length !== selectedPigIds.length) {
        throw new NotFoundException(
          'One or more selected pigs were not found or are no longer active',
        );
      }

      const sales = await this.prisma.$transaction(async (tx) => {
        const createdSales: unknown[] = [];

        for (const pigId of selectedPigIds) {
          const sale = await tx.sale.create({
            data: {
              farmId,
              pigId,
              quantity: 1,
              unitPrice: dto.unitPrice,
              totalAmount: dto.unitPrice,
              saleDate,
              buyerName: dto.buyerName,
              notes: dto.notes,
            },
            include: {
              pig: true,
            },
          });

          await tx.pigEvent.create({
            data: {
              farmId,
              pigId,
              type: 'SALE',
              eventDate: saleDate,
              cost: dto.unitPrice,
              notes:
                dto.notes ??
                `Pig sold to ${dto.buyerName ?? 'buyer'} for ${dto.unitPrice}`,
            },
          });

          await tx.pig.update({
            where: { id: pigId },
            data: { status: 'SOLD', pigGroupId: null },
          });

          createdSales.push(sale);
        }

        return createdSales;
      });

      return {
        message: `Sale recorded for ${sales.length} pigs`,
        count: sales.length,
        sales,
      };
    }

    const quantity = dto.quantity ?? 1;
    const totalAmount = quantity * dto.unitPrice;

    return this.prisma.sale.create({
      data: {
        farmId,
        quantity,
        unitPrice: dto.unitPrice,
        totalAmount,
        saleDate,
        buyerName: dto.buyerName,
        notes: dto.notes,
      },
      include: {
        pig: true,
      },
    });
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

  async pigProfits(farmId: string) {
    const [pigs, salesByPig, expensesByPig] = await Promise.all([
      this.prisma.pig.findMany({
        where: { farmId },
        select: {
          id: true,
          tagNumber: true,
          name: true,
          status: true,
        },
        orderBy: { tagNumber: 'asc' },
      }),
      this.prisma.sale.groupBy({
        by: ['pigId'],
        where: {
          farmId,
          pigId: { not: null },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['pigId'],
        where: {
          farmId,
          pigId: { not: null },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const salesMap = new Map(
      salesByPig
        .filter((item) => item.pigId)
        .map((item) => [
          item.pigId!,
          {
            totalRevenue: item._sum.totalAmount ?? 0,
            saleCount: item._count,
          },
        ]),
    );

    const expensesMap = new Map(
      expensesByPig
        .filter((item) => item.pigId)
        .map((item) => [
          item.pigId!,
          {
            totalExpenses: item._sum.amount ?? 0,
            expenseCount: item._count,
          },
        ]),
    );

    return pigs
      .map((pig) => {
        const sales = salesMap.get(pig.id);
        const expenses = expensesMap.get(pig.id);
        const totalRevenue = sales?.totalRevenue ?? 0;
        const totalExpenses = expenses?.totalExpenses ?? 0;
        const netProfit = totalRevenue - totalExpenses;

        return {
          pigId: pig.id,
          tagNumber: pig.tagNumber,
          name: pig.name,
          pigStatus: pig.status,
          totalRevenue,
          totalExpenses,
          netProfit,
          saleCount: sales?.saleCount ?? 0,
          expenseCount: expenses?.expenseCount ?? 0,
          profitStatus:
            netProfit > 0
              ? 'PROFIT'
              : netProfit < 0
                ? 'LOSS'
                : 'BREAK_EVEN',
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit);
  }
}
