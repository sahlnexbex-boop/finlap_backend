import { Request, Response } from 'express';
import { prisma } from '../db';

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const budgets = await prisma.budget.findMany();
    const goals = await prisma.goal.findMany();

    const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);

    res.json({
      success: true,
      summary: {
        totalLimit: totalBudgetLimit,
        totalSpent: totalBudgetSpent,
        remaining: totalBudgetLimit - totalBudgetSpent,
        percentageUsed: totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0,
      },
      budgets,
      goals,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, spent } = req.body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(limit !== undefined && { limit: parseFloat(limit) }),
        ...(spent !== undefined && { spent: parseFloat(spent) }),
      },
    });

    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update budget' });
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const { title, target, current, category, targetDate, color } = req.body;

    const goal = await prisma.goal.create({
      data: {
        title,
        target: parseFloat(target),
        current: parseFloat(current || 0),
        category,
        targetDate: targetDate || '2026-12-31',
        color: color || '#4edea3',
      },
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create goal' });
  }
};
