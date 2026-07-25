import { Request, Response } from 'express';
import { prisma } from '../db';

export const getOverview = async (req: Request, res: Response) => {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Julian Sterling',
          email: 'julian.sterling@finlap.io',
          currency: 'USD',
          memberTier: 'Platinum Member',
          proBadge: true,
          biometrics: true,
          notifications: true,
          securityPin: '1234',
        },
      });
    }

    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const businessEntities = await prisma.businessEntity.findMany();

    res.json({
      user,
      portfolioValue: 1248590.00,
      growthPercent: 12.4,
      spendingPulse: 248,
      budgetPercent: 85,
      weeklyAnalytics: [
        { day: 'MON', val: 40 },
        { day: 'TUE', val: 65 },
        { day: 'WED', val: 50 },
        { day: 'THU', val: 85, active: true },
        { day: 'FRI', val: 45 },
        { day: 'SAT', val: 75 },
        { day: 'SUN', val: 90 },
      ],
      recentTransactions: transactions,
      businessEntities,
    });
  } catch (error) {
    res.json({
      user: {
        name: 'Julian Sterling',
        email: 'julian.sterling@finlap.io',
        currency: 'USD',
        memberTier: 'Platinum Member',
        proBadge: true,
        biometrics: true,
        notifications: true,
        securityPin: '1234',
      },
      portfolioValue: 1248590.00,
      growthPercent: 12.4,
      spendingPulse: 248,
      budgetPercent: 85,
      weeklyAnalytics: [
        { day: 'MON', val: 40 },
        { day: 'TUE', val: 65 },
        { day: 'WED', val: 50 },
        { day: 'THU', val: 85, active: true },
        { day: 'FRI', val: 45 },
        { day: 'SAT', val: 75 },
        { day: 'SUN', val: 90 },
      ],
      recentTransactions: [
        {
          id: '1',
          title: 'Business A',
          merchant: 'Business A',
          amount: -1184.50,
          type: 'EXPENSE',
          category: 'Inventory Order',
          date: 'Oct 24, 2023',
          time: '2:45 PM',
          note: 'Inventory Order',
          businessName: 'Business A',
        },
        {
          id: '2',
          title: 'Tech Solutions LLC',
          merchant: 'Tech Solutions LLC',
          amount: -245.00,
          type: 'EXPENSE',
          category: 'Software',
          date: 'Yesterday',
          time: '10:15 AM',
          note: 'SaaS Subscription',
          businessName: 'Tech Solutions LLC',
        },
        {
          id: '3',
          title: 'Vertex Agency',
          merchant: 'Vertex Agency',
          amount: 8550.00,
          type: 'INCOME',
          category: 'Services',
          date: 'Oct 24',
          time: '09:00 AM',
          note: 'Service Payout',
          businessName: 'Vertex Agency',
        },
      ],
    });
  }
};
