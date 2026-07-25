import { Request, Response } from 'express';
import { prisma } from '../db';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { category, type, search } = req.query;

    let whereClause: any = {};
    if (category && category !== 'ALL') {
      whereClause.category = String(category);
    }
    if (type && type !== 'ALL') {
      whereClause.type = String(type);
    }

    let transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (search) {
      const query = String(search).toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.merchant.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          (t.note && t.note.toLowerCase().includes(query)) ||
          (t.businessName && t.businessName.toLowerCase().includes(query))
      );
    }

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      title,
      merchant,
      amount,
      type,
      category,
      walletName,
      businessName,
      businessEntityId,
      note,
      fundingSource,
      isRecurring,
      attachmentUrl,
      date,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const now = new Date();
    const dateStr = date || 'Oct 24, 2023';
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const numericAmount = parseFloat(amount);
    const finalAmount = type === 'EXPENSE' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

    const displayTitle = businessName || title || merchant || 'Business Transaction';

    const transaction = await prisma.transaction.create({
      data: {
        title: displayTitle,
        merchant: merchant || displayTitle,
        amount: finalAmount,
        type: type || (finalAmount < 0 ? 'EXPENSE' : 'INCOME'),
        category: category || 'Software',
        date: dateStr,
        time: timeStr,
        walletName: walletName || fundingSource || 'Chase Business',
        businessName: businessName || 'Nexus Dynamics LLC',
        businessEntityId,
        note: note || '',
        fundingSource: fundingSource || 'Chase Business',
        isRecurring: Boolean(isRecurring),
        attachmentUrl: attachmentUrl || null,
        icon: 'building',
        status: 'COMPLETED',
      },
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Failed to create transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
};
