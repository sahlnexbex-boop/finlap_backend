import { Request, Response } from 'express';
import { prisma } from '../db';

export const getWallets = async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany();
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
    const { name, type, accountNo, balance, cardHolder, expiry, cardType, colorAccent } = req.body;

    const wallet = await prisma.wallet.create({
      data: {
        name,
        type: type || 'CHECKING',
        accountNo: accountNo || '•••• ' + Math.floor(1000 + Math.random() * 9000),
        balance: parseFloat(balance || 0),
        cardHolder: cardHolder || 'ALEX VANCE',
        expiry: expiry || '12/28',
        cardType: cardType || 'VISA',
        colorAccent: colorAccent || '#3b82f6',
      },
    });

    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create wallet' });
  }
};
