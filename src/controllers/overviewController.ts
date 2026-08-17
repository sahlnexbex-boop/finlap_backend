import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

const TRANSACTION_TYPE = {
  EXPENSE: 0,
  INCOME: 1,
} as const;

const isIncomeTransaction = (transaction: { type: unknown; amount: number }) =>
  transaction.type === TRANSACTION_TYPE.INCOME ||
  transaction.type === '1' ||
  transaction.type === 'INCOME' ||
  (transaction.type !== TRANSACTION_TYPE.EXPENSE && transaction.type !== '0' && transaction.type !== 'EXPENSE' && transaction.amount > 0);

const buildFallbackUserEmail = (userId: string) => {
  const cleanId = userId.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${cleanId || 'user'}@finlap.local`;
};

const transactionSummarySelect = {
  id: true,
  userId: true,
  title: true,
  merchant: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  time: true,
  status: true,
  walletId: true,
  walletName: true,
  businessEntityId: true,
  businessName: true,
  note: true,
  fundingSource: true,
  isRecurring: true,
  icon: true,
  isReturnable: true,
  returnableType: true,
  returnableStatus: true,
  settledAmount: true,
  relatedTransactionId: true,
  counterparty: true,
  createdAt: true,
} as const;

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  country: true,
  sex: true,
  place: true,
  phone: true,
  currency: true,
  memberTier: true,
  proBadge: true,
  biometrics: true,
  notifications: true,
  securityPin: true,
  theme: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getOverview = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);

    // Parse optional filter query params
    const filterMonth = req.query.month ? String(req.query.month) : undefined; // e.g. "2026-07"
    const filterEntityId = req.query.entityId ? String(req.query.entityId) : undefined;
    const filterAccountId = req.query.accountId ? String(req.query.accountId) : undefined;

    let user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect }).catch(() => null);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Build where clause for transactions
    const txWhere: any = { userId };
    if (filterEntityId && filterEntityId !== 'ALL') {
      txWhere.businessEntityId = filterEntityId;
    }
    if (filterAccountId && filterAccountId !== 'ALL') {
      txWhere.OR = [
        { fundingSource: filterAccountId },
        { walletName: filterAccountId },
      ];
    }

    const userTransactions = await prisma.transaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      select: transactionSummarySelect,
    });

    // Apply month filter in JS (since date is stored as string)
    let allTx = userTransactions;
    if (filterMonth && filterMonth !== 'ALL') {
      allTx = allTx.filter((t) => {
        try {
          const d = new Date(t.date);
          const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return txMonth === filterMonth;
        } catch {
          return true;
        }
      });
    }

    const totalIncomeAmount = allTx
      .filter(isIncomeTransaction)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenseAmount = allTx
      .filter((t) => !isIncomeTransaction(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalTransactionAmount = totalIncomeAmount - totalExpenseAmount;

    const growthPercent =
      totalIncomeAmount > 0 ? Math.round((totalTransactionAmount / totalIncomeAmount) * 100 * 10) / 10 : 0;

    // Build real weekly analytics from actual transactions (current week)
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0..Sun=6
    const mondayStart = new Date(now);
    mondayStart.setDate(now.getDate() - dayOfWeek);
    mondayStart.setHours(0, 0, 0, 0);

    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const weeklyAnalytics = dayNames.map((day, idx) => {
      const dayDate = new Date(mondayStart);
      dayDate.setDate(mondayStart.getDate() + idx);
      const dayStr = dayDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

      const dayTransactions = allTx.filter((t) => {
        try {
          const txDate = new Date(t.date);
          return txDate.toISOString().split('T')[0] === dayStr;
        } catch {
          return false;
        }
      });

      const dayIncome = dayTransactions
        .filter(isIncomeTransaction)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const dayExpense = dayTransactions
        .filter((t) => !isIncomeTransaction(t))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        day,
        income: dayIncome,
        expense: dayExpense,
        active: idx === dayOfWeek,
      };
    });

    const businessEntities = await prisma.businessEntity
      .findMany({
        where: { userId },
      })
      .catch((err) => {
        console.error('getOverview businessEntities error:', err);
        return [];
      });

    const accounts = await prisma.account
      .findMany({
        where: { userId },
      })
      .catch((err) => {
        console.error('getOverview accounts error:', err);
        return [];
      });

    // Build available months from transactions for month picker
    const monthSet = new Set<string>();
    userTransactions.forEach((t) => {
      try {
        const d = new Date(t.date);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(m);
      } catch {}
    });
    const upcomingReminders = await (prisma as any).reminder
      ?.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 3,
      })
      .catch((err: any) => {
        console.error('getOverview reminders error:', err);
        return [];
      }) ?? [];
    const availableMonths = Array.from(monthSet).sort().reverse();

    // Calculate returnables (Receivables & Payables)
    const receivableTxs = userTransactions.filter(
      (t: any) =>
        t.isReturnable &&
        (t.returnableType === 'RECEIVABLE' || (!isIncomeTransaction(t) && !t.returnableType)) &&
        t.returnableStatus !== 'SETTLED'
    );
    const payableTxs = userTransactions.filter(
      (t: any) =>
        t.isReturnable &&
        (t.returnableType === 'PAYABLE' || (isIncomeTransaction(t) && !t.returnableType)) &&
        t.returnableStatus !== 'SETTLED'
    );

    const totalReceivableAmount = receivableTxs.reduce(
      (sum, t: any) => sum + Math.max(0, Math.abs(t.amount) - (t.settledAmount || 0)),
      0
    );
    const totalPayableAmount = payableTxs.reduce(
      (sum, t: any) => sum + Math.max(0, Math.abs(t.amount) - (t.settledAmount || 0)),
      0
    );
    const netReturnableBalance = totalReceivableAmount - totalPayableAmount;

    res.json({
      user,
      total: totalTransactionAmount,
      income_total: totalIncomeAmount,
      expense_total: totalExpenseAmount,
      totalTransactionAmount,
      totalIncomeAmount,
      totalExpenseAmount,
      totalReceivableAmount,
      totalPayableAmount,
      netReturnableBalance,
      pendingReceivablesCount: receivableTxs.length,
      pendingPayablesCount: payableTxs.length,
      growthPercent,
      weeklyAnalytics,
      recentTransactions: allTx.slice(0, 10),
      businessEntities,
      accounts,
      availableMonths,
      upcomingReminders,
    });
  } catch (error: any) {
    console.error('getOverview error details:', error?.stack || error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview metrics',
      details: error?.message || String(error),
    });
  }
};
