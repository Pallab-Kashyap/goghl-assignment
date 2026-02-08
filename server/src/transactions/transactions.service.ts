import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const { date, ...rest } = createTransactionDto;

    return await this.prisma.transaction.create({
      data: {
        ...rest,
        date: date ? new Date(date) : new Date(),
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(userId: string, query: TransactionQueryDto) {
    const {
      type,
      categoryId,
      date,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = query;

    // Build date filter - exact date takes priority over range
    let dateFilter: Prisma.TransactionWhereInput['date'] | undefined;
    if (date) {
      // For exact date, filter from start of day to end of day
      const exactDate = new Date(date);
      const startOfDay = new Date(exactDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(exactDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate || endDate) {
      dateFilter = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(dateFilter && { date: dateFilter }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    userId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    await this.findOne(id, userId);

    const { date, ...rest } = updateTransactionDto;

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...rest,
        ...(date && { date: new Date(date) }),
      },
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  async getChartData(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all transactions in the date range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate weeks in the date range
    const weeks: { name: string; startDate: Date; endDate: Date }[] = [];
    const currentDate = new Date(start);
    let weekNum = 1;

    while (currentDate <= end) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Ensure week end doesn't exceed the overall end date
      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }

      weeks.push({
        name: `Week ${weekNum}`,
        startDate: weekStart,
        endDate: weekEnd,
      });

      currentDate.setDate(currentDate.getDate() + 7);
      weekNum++;
    }

    // Aggregate transactions by week
    const chartData = weeks.map((week) => {
      const weekTransactions = transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= week.startDate && txDate <= week.endDate;
      });

      const income = weekTransactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = weekTransactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        name: week.name,
        income,
        expense,
      };
    });

    return chartData;
  }
}
