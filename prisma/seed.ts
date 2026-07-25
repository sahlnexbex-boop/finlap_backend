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
      name: 'Nexus Dynamics LLC',
      subtitle: 'Primary Operating Unit',
      isPrimary: true,
    },
  });

  const bizA = await prisma.businessEntity.create({
    data: {
      name: 'Business A',
      subtitle: 'Inventory & Operations',
      isPrimary: false,
    },
  });

  const techSol = await prisma.businessEntity.create({
    data: {
      name: 'Tech Solutions LLC',
      subtitle: 'Software & Infrastructure',
      isPrimary: false,
    },
  });

  const vertex = await prisma.businessEntity.create({
    data: {
      name: 'Vertex Agency',
      subtitle: 'Client Services',
      isPrimary: false,
    },
  });

  // Wallets
  await prisma.wallet.deleteMany({});
  await prisma.wallet.createMany({
    data: [
      {
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
        title: 'Business A',
        merchant: 'Business A Supplier',
        amount: -1184.50,
        type: 'EXPENSE',
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
        title: 'Tech Solutions LLC',
        merchant: 'Tech Solutions LLC',
        amount: -245.00,
        type: 'EXPENSE',
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
        title: 'Vertex Agency',
        merchant: 'Vertex Agency',
        amount: 8550.00,
        type: 'INCOME',
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
      { category: 'Software', limit: 2000.0, spent: 245.0, icon: 'code', color: '#8b5cf6' },
      { category: 'Payroll', limit: 15000.0, spent: 8500.0, icon: 'users', color: '#a78bfa' },
      { category: 'Services', limit: 5000.0, spent: 1184.5, icon: 'briefcase', color: '#c4b5fd' },
      { category: 'Office', limit: 1000.0, spent: 320.0, icon: 'building', color: '#6366f1' },
    ],
  });

  // Goals
  await prisma.goal.deleteMany({});
  await prisma.goal.createMany({
    data: [
      { title: 'Series A Capital Reserve', target: 2000000.0, current: 1248590.0, category: 'Corporate', targetDate: '2026-12-31', color: '#8b5cf6' },
    ],
  });

  // Net Worth History
  await prisma.netWorthHistory.deleteMany({});
  await prisma.netWorthHistory.createMany({
    data: [
      { month: 'MON', netWorth: 1100000.0, assets: 1150000.0, liabilities: 50000.0 },
      { month: 'TUE', netWorth: 1120000.0, assets: 1170000.0, liabilities: 50000.0 },
      { month: 'WED', netWorth: 1150000.0, assets: 1200000.0, liabilities: 50000.0 },
      { month: 'THU', netWorth: 1248590.0, assets: 1298590.0, liabilities: 50000.0 },
      { month: 'FRI', netWorth: 1210000.0, assets: 1260000.0, liabilities: 50000.0 },
      { month: 'SAT', netWorth: 1230000.0, assets: 1280000.0, liabilities: 50000.0 },
      { month: 'SUN', netWorth: 1248590.0, assets: 1298590.0, liabilities: 50000.0 },
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
