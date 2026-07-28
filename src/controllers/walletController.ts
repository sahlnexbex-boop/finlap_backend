import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

export const getWallets = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const wallets = await prisma.wallet.findMany({
      where: { userId } as any,
      orderBy: { createdAt: 'desc' },
    });
    const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

    res.json({
      success: true,
      totalBalance,
      wallets,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
  }
};

export const createWallet = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { name, type, accountNo, balance, cardHolder, expiry, cardType, colorAccent } = req.body;

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        name,
        type: type || 'CHECKING',
        accountNo: accountNo || '•••• ' + Math.floor(1000 + Math.random() * 9000),
        balance: parseFloat(balance || 0),
        cardHolder: cardHolder || 'ALEX VANCE',
        expiry: expiry || '12/28',
        cardType: cardType || 'VISA',
        colorAccent: colorAccent || '#3b82f6',
      } as any,
    });

    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create wallet' });
  }
};
