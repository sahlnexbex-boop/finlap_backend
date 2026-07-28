import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const history = await prisma.netWorthHistory.findMany({
      where: { userId } as any,
      orderBy: { createdAt: 'asc' },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId } as any,
    });

    const categoryBreakdown = budgets.map((b) => ({
      category: b.category,
      amount: b.spent,
      color: b.color,
    }));

    const monthlyComparison = [
      { month: 'Jan', income: 14000, expense: 3800 },
      { month: 'Feb', income: 15500, expense: 4100 },
      { month: 'Mar', income: 15000, expense: 3900 },
      { month: 'Apr', income: 16800, expense: 4500 },
      { month: 'May', income: 17200, expense: 4000 },
      { month: 'Jun', income: 18500, expense: 4210 },
    ];

    res.json({
      success: true,
      netWorthTrend: history,
      categoryBreakdown,
      monthlyComparison,
      metrics: {
        savingsRate: '77.2%',
        spendingVelocity: '-4.8% vs last month',
        topExpenseCategory: 'Dining & Experiences',
        cashFlowHealth: 'Optimal (9.4/10)',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};
