import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId, seedDefaultDataForUser } from './userController';

// GET /api/accounts
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    let accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (accounts.length === 0) {
      await seedDefaultDataForUser(userId);
      accounts = await prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    res.json({ success: true, totalBalance, data: accounts });
  } catch (error) {
    console.error('getAccounts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
};

// POST /api/accounts
export const createAccount = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { name, type, balance, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Account name is required' });
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name: name.trim(),
        type: type || 'bank',
        balance: parseFloat(balance || '0'),
        icon: icon || 'landmark',
        color: color || '#3B82F6',
      },
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('createAccount error:', error);
    res.status(500).json({ success: false, error: 'Failed to create account' });
  }
};

// PUT /api/accounts/:id
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const { name, type, balance, icon, color } = req.body;

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateAccount error:', error);
    res.status(500).json({ success: false, error: 'Failed to update account' });
  }
};

// DELETE /api/accounts/:id
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    await prisma.account.delete({ where: { id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};
