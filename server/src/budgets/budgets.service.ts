import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetQueryDto,
} from './dto/budget.dto';
import { Prisma } from '@prisma/client';

function isPrismaError(
  error: unknown,
): error is { code: string; meta?: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    try {
      return await this.prisma.budget.create({
        data: {
          ...createBudgetDto,
          userId,
        },
        include: { category: true },
      });
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === 'P2002') {
        throw new ConflictException(
          'Budget for this category and period already exists',
        );
      }
      throw error;
    }
  }

  async findAll(userId: string, query: BudgetQueryDto) {
    const { month, year } = query;

    const where: Prisma.BudgetWhereInput = {
      userId,
      ...(month && { month }),
      ...(year && { year }),
    };

    const budgets = await this.prisma.budget.findMany({
      where,
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59);

        const spent = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amount: true },
        });

        return {
          ...budget,
          spent: Number(spent._sum.amount || 0),
          remaining: Number(budget.amount) - Number(spent._sum.amount || 0),
        };
      }),
    );

    return budgetsWithSpent;
  }

  async findOne(id: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Calculate spent amount
    const startDate = new Date(budget.year, budget.month - 1, 1);
    const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59);

    const spent = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    return {
      ...budget,
      spent: Number(spent._sum.amount || 0),
      remaining: Number(budget.amount) - Number(spent._sum.amount || 0),
    };
  }

  async update(id: string, userId: string, updateBudgetDto: UpdateBudgetDto) {
    await this.findOne(id, userId);

    return this.prisma.budget.update({
      where: { id },
      data: updateBudgetDto,
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.budget.delete({
      where: { id },
    });
  }
}
