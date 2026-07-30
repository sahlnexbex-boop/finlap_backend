import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

const normalizeTransactionType = (type: unknown, amount?: number) => {
  if (type === 1 || type === '1' || type === 'INCOME') return 'INCOME';
  if (type === 0 || type === '0' || type === 'EXPENSE') return 'EXPENSE';
  return amount !== undefined && amount > 0 ? 'INCOME' : 'EXPENSE';
};

export const getReportData = async (userId: string, queryParams: any) => {
  const { period, startDate, endDate, date, month, year, type, account, businessEntityId, category } = queryParams;

  let whereClause: any = { userId };

  if (category && category !== 'ALL') {
    whereClause.category = String(category);
  }
  if (type && type !== 'ALL') {
    const isIncome = type === '1' || type === 1 || type === 'INCOME';
    whereClause.type = isIncome ? 1 : 0;
  }
  if (account && account !== 'ALL') {
    whereClause.OR = [
      { fundingSource: String(account) },
      { walletName: String(account) },
    ];
  }
  if (businessEntityId && businessEntityId !== 'ALL') {
    whereClause.businessEntityId = String(businessEntityId);
  }
  if (date && date !== 'ALL') {
    whereClause.date = String(date);
  }

  let transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  // Filter by date range / period
  const getTimestamp = (t: any) => {
    try {
      const parsed = new Date(t.date);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    } catch (e) {}
    return new Date(t.createdAt).getTime();
  };

  if (startDate || endDate || period) {
    const now = new Date();
    let startMs = 0;
    let endMs = Infinity;

    if (startDate) {
      startMs = new Date(String(startDate)).getTime();
    }
    if (endDate) {
      endMs = new Date(String(endDate)).setHours(23, 59, 59, 999);
    }

    if (!startDate && !endDate && period) {
      if (period === 'day') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startMs = today.getTime();
        endMs = today.getTime() + 24 * 60 * 60 * 1000 - 1;
      } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startMs = startOfMonth.getTime();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        endMs = endOfMonth.getTime();
      } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startMs = startOfYear.getTime();
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        endMs = endOfYear.getTime();
      }
    }

    if (startMs > 0 || endMs < Infinity) {
      transactions = transactions.filter((t) => {
        const ts = getTimestamp(t);
        return ts >= startMs && ts <= endMs;
      });
    }
  }

  let totalIncome = 0;
  let totalExpense = 0;

  const categoryMap: Record<string, { income: number; expense: number; count: number }> = {};
  const accountMap: Record<string, { income: number; expense: number; count: number }> = {};
  const entityMap: Record<string, { name: string; income: number; expense: number; count: number }> = {};

  transactions.forEach((t) => {
    const tType = normalizeTransactionType(t.type, t.amount);
    const absAmt = Math.abs(t.amount);

    if (tType === 'INCOME') {
      totalIncome += absAmt;
    } else {
      totalExpense += absAmt;
    }

    // Category breakdown
    const cat = t.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { income: 0, expense: 0, count: 0 };
    if (tType === 'INCOME') categoryMap[cat].income += absAmt;
    else categoryMap[cat].expense += absAmt;
    categoryMap[cat].count += 1;

    // Account breakdown
    const acc = t.fundingSource || t.walletName || 'Default Account';
    if (!accountMap[acc]) accountMap[acc] = { income: 0, expense: 0, count: 0 };
    if (tType === 'INCOME') accountMap[acc].income += absAmt;
    else accountMap[acc].expense += absAmt;
    accountMap[acc].count += 1;

    // Business Entity breakdown
    const entId = t.businessEntityId || 'no-entity';
    const entName = t.businessName || 'General';
    if (!entityMap[entId]) entityMap[entId] = { name: entName, income: 0, expense: 0, count: 0 };
    if (tType === 'INCOME') entityMap[entId].income += absAmt;
    else entityMap[entId].expense += absAmt;
    entityMap[entId].count += 1;
  });

  const netBalance = totalIncome - totalExpense;

  const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    income: data.income,
    expense: data.expense,
    net: data.income - data.expense,
    count: data.count,
    percentage: totalExpense > 0 ? Number(((data.expense / totalExpense) * 100).toFixed(1)) : 0,
  }));

  const accountBreakdown = Object.entries(accountMap).map(([account, data]) => ({
    account,
    income: data.income,
    expense: data.expense,
    net: data.income - data.expense,
    count: data.count,
  }));

  const entityBreakdown = Object.entries(entityMap).map(([id, data]) => ({
    id,
    name: data.name,
    income: data.income,
    expense: data.expense,
    net: data.income - data.expense,
    count: data.count,
  }));

  return {
    period: period || 'all',
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      transactionCount: transactions.length,
    },
    categoryBreakdown,
    accountBreakdown,
    entityBreakdown,
    transactions,
  };
};

export const getReport = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const reportData = await getReportData(userId, req.query);
    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate financial report' });
  }
};

export const exportReport = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { format = 'excel' } = req.query;
    const reportData = await getReportData(userId, req.query);

    const filename = `finlap_report_${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`;

    if (format === 'excel' || format === 'csv') {
      // CSV format export
      const headers = ['Date', 'Time', 'Title/Business', 'Category', 'Account', 'Type', 'Amount (INR)', 'Note'];
      const rows = reportData.transactions.map((t: any) => {
        const tType = normalizeTransactionType(t.type, t.amount);
        return [
          `"${t.date}"`,
          `"${t.time || ''}"`,
          `"${(t.title || t.businessName || '').replace(/"/g, '""')}"`,
          `"${(t.category || '').replace(/"/g, '""')}"`,
          `"${(t.fundingSource || '').replace(/"/g, '""')}"`,
          `"${tType}"`,
          t.amount,
          `"${(t.note || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const csvContent = [
        'FinLap Financial Report',
        `Summary: Total Income = ₹${reportData.summary.totalIncome.toFixed(2)} | Total Expense = ₹${reportData.summary.totalExpense.toFixed(2)} | Net Balance = ₹${reportData.summary.netBalance.toFixed(2)}`,
        '',
        headers.join(','),
        ...rows,
      ].join('\n');

      res.json({
        success: true,
        format: 'csv',
        filename,
        content: csvContent,
      });
    } else {
      // HTML representation for PDF print download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>FinLap Ledger Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
            h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .summary { display: flex; gap: 20px; margin: 20px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; }
            .income { color: #10b981; font-size: 20px; font-weight: bold; }
            .expense { color: #ef4444; font-size: 20px; font-weight: bold; }
            .net { color: #3b82f6; font-size: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>FinLap Financial Ledger Report</h1>
          <div class="summary">
            <div class="card">
              <div>Total Income</div>
              <div class="income">₹${reportData.summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div>Total Expense</div>
              <div class="expense">₹${reportData.summary.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div>Net Balance</div>
              <div class="net">₹${reportData.summary.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          <h2>Transaction History</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title / Business</th>
                <th>Category</th>
                <th>Account</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions
                .map((t: any) => {
                  const isInc = t.type === 1 || t.type === '1' || t.type === 'INCOME' || t.amount > 0;
                  return `
                  <tr>
                    <td>${t.date}</td>
                    <td>${t.title || t.businessName}</td>
                    <td>${t.category}</td>
                    <td>${t.fundingSource || 'Account'}</td>
                    <td>${isInc ? 'Income' : 'Expense'}</td>
                    <td style="color: ${isInc ? '#10b981' : '#ef4444'}; font-weight: bold;">
                      ${isInc ? '+' : '-'}₹${Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      res.json({
        success: true,
        format: 'pdf',
        filename,
        content: htmlContent,
      });
    }
  } catch (error) {
    console.error('Failed to export report:', error);
    res.status(500).json({ success: false, error: 'Failed to export financial report' });
  }
};
