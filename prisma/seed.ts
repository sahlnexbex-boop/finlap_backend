import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding FinLap database...');

  // User
  await prisma.user.deleteMany({});
  const user = await prisma.user.create({
    data: {
      name: 'Julian Sterling',
      email: 'julian.sterling@finlap.io',
      password: 'password123',
      currency: 'USD',
      memberTier: 'Platinum Member',
      proBadge: true,
      biometrics: true,
      notifications: true,
      securityPin: '1234',
      theme: 'Midnight Slate',
      language: 'English (US)',
    },
  });

  // Business Entities
  await prisma.businessEntity.deleteMany({});
  const nexus = await prisma.businessEntity.create({
    data: {
      userId: user.id,
      name: 'Nexus Dynamics LLC',
      subtitle: 'Primary Operating Unit',
      isPrimary: true,
    },
  });

  const bizA = await prisma.businessEntity.create({
    data: {
      userId: user.id,
      name: 'Business A',
      subtitle: 'Inventory & Operations',
      isPrimary: false,
    },
  });

  const techSol = await prisma.businessEntity.create({
    data: {
      userId: user.id,
      name: 'Tech Solutions LLC',
      subtitle: 'Software & Infrastructure',
      isPrimary: false,
    },
  });

  const vertex = await prisma.businessEntity.create({
    data: {
      userId: user.id,
      name: 'Vertex Agency',
      subtitle: 'Client Services',
      isPrimary: false,
    },
  });

  await prisma.account.deleteMany({});
  await prisma.account.createMany({
    data: [
      {
        userId: user.id,
        name: 'Chase Business',
        type: 'bank',
        balance: 1248590.0,
        icon: 'landmark',
        color: '#3B82F6',
      },
      {
        userId: user.id,
        name: 'Office Cash',
        type: 'cash',
        balance: 2500.0,
        icon: 'wallet',
        color: '#10B981',
      },
    ],
  });

  await prisma.category.deleteMany({});
  await prisma.category.createMany({
    data: [
      { userId: user.id, name: 'Software', icon: 'code', color: '#8B5CF6' },
      { userId: user.id, name: 'Payroll', icon: 'users', color: '#A78BFA' },
      { userId: user.id, name: 'Services', icon: 'briefcase', color: '#10B981' },
      { userId: user.id, name: 'Inventory Order', icon: 'building', color: '#F59E0B' },
    ],
  });

  // Wallets
  await prisma.wallet.deleteMany({});
  await prisma.wallet.createMany({
    data: [
      {
        userId: user.id,
        name: 'Chase Business Operating',
        type: 'BUSINESS',
        accountNo: '•••• 8821',
        balance: 1248590.00,
        currency: 'USD',
        cardHolder: 'JULIAN STERLING',
        expiry: '08/28',
        cardType: 'VISA',
        colorAccent: '#8b5cf6',
      },
      {
        userId: user.id,
        name: 'High Yield Treasury',
        type: 'SAVINGS',
        accountNo: '•••• 9102',
        balance: 450000.00,
        currency: 'USD',
        cardHolder: 'JULIAN STERLING',
        expiry: '12/30',
        cardType: 'MASTERCARD',
        colorAccent: '#a78bfa',
      },
    ],
  });

  // Transactions (matching Image 3 Business Transactions section)
  await prisma.transaction.deleteMany({});
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        title: 'Business A',
        merchant: 'Business A Supplier',
        amount: -1184.50,
        type: 0,
        category: 'Inventory Order',
        date: 'Oct 24, 2023',
        time: '2:45 PM',
        status: 'COMPLETED',
        walletName: 'Chase Business',
        businessEntityId: bizA.id,
        businessName: 'Business A',
        note: 'Inventory Order',
        fundingSource: 'Chase Business',
        icon: 'building',
      },
      {
        userId: user.id,
        title: 'Tech Solutions LLC',
        merchant: 'Tech Solutions LLC',
        amount: -245.00,
        type: 0,
        category: 'Software',
        date: 'Yesterday',
        time: '10:15 AM',
        status: 'COMPLETED',
        walletName: 'Chase Business',
        businessEntityId: techSol.id,
        businessName: 'Tech Solutions LLC',
        note: 'SaaS Subscription',
        fundingSource: 'Chase Business',
        icon: 'code',
      },
      {
        userId: user.id,
        title: 'Vertex Agency',
        merchant: 'Vertex Agency',
        amount: 8550.00,
        type: 1,
        category: 'Services',
        date: 'Oct 24',
        time: '09:00 AM',
        status: 'COMPLETED',
        walletName: 'Chase Business',
        businessEntityId: vertex.id,
        businessName: 'Vertex Agency',
        note: 'Service Payout',
        fundingSource: 'Chase Business',
        icon: 'store',
      },
    ],
  });

  // Budgets
  await prisma.budget.deleteMany({});
  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: 'Software', limit: 2000.0, spent: 245.0, icon: 'code', color: '#8b5cf6' },
      { userId: user.id, category: 'Payroll', limit: 15000.0, spent: 8500.0, icon: 'users', color: '#a78bfa' },
      { userId: user.id, category: 'Services', limit: 5000.0, spent: 1184.5, icon: 'briefcase', color: '#c4b5fd' },
      { userId: user.id, category: 'Office', limit: 1000.0, spent: 320.0, icon: 'building', color: '#6366f1' },
    ],
  });

  // Goals
  await prisma.goal.deleteMany({});
  await prisma.goal.createMany({
    data: [
      { userId: user.id, title: 'Series A Capital Reserve', target: 2000000.0, current: 1248590.0, category: 'Corporate', targetDate: '2026-12-31', color: '#8b5cf6' },
    ],
  });

  // Net Worth History
  await prisma.netWorthHistory.deleteMany({});
  await prisma.netWorthHistory.createMany({
    data: [
      { userId: user.id, month: 'MON', netWorth: 1100000.0, assets: 1150000.0, liabilities: 50000.0 },
      { userId: user.id, month: 'TUE', netWorth: 1120000.0, assets: 1170000.0, liabilities: 50000.0 },
      { userId: user.id, month: 'WED', netWorth: 1150000.0, assets: 1200000.0, liabilities: 50000.0 },
      { userId: user.id, month: 'THU', netWorth: 1248590.0, assets: 1298590.0, liabilities: 50000.0 },
      { userId: user.id, month: 'FRI', netWorth: 1210000.0, assets: 1260000.0, liabilities: 50000.0 },
      { userId: user.id, month: 'SAT', netWorth: 1230000.0, assets: 1280000.0, liabilities: 50000.0 },
      { userId: user.id, month: 'SUN', netWorth: 1248590.0, assets: 1298590.0, liabilities: 50000.0 },
    ],
  });

  console.log('Seeding completed successfully for Julian Sterling!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
