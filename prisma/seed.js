"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seed() {
    console.log('Seeding FinLap database...');
    // User
    const user = await prisma.user.upsert({
        where: { email: 'alex.vance@finlap.io' },
        update: {},
        create: {
            name: 'Alex Vance',
            email: 'alex.vance@finlap.io',
            currency: 'USD',
            biometrics: true,
            notifications: true,
        },
    });
    // Wallets
    await prisma.wallet.deleteMany({});
    await prisma.wallet.createMany({
        data: [
            {
                userId: user.id,
                name: 'Aura Platinum Card',
                type: 'CHECKING',
                accountNo: '•••• 4892',
                balance: 64820.50,
                currency: 'USD',
                cardHolder: 'ALEX VANCE',
                expiry: '09/29',
                cardType: 'VISA',
                colorAccent: '#3b82f6',
            },
            {
                userId: user.id,
                name: 'High Yield Savings',
                type: 'SAVINGS',
                accountNo: '•••• 9102',
                balance: 52400.00,
                currency: 'USD',
                cardHolder: 'ALEX VANCE',
                expiry: '12/30',
                cardType: 'MASTERCARD',
                colorAccent: '#4edea3',
            },
            {
                userId: user.id,
                name: 'Venture Capital Wallet',
                type: 'BUSINESS',
                accountNo: '•••• 3311',
                balance: 25629.95,
                currency: 'USD',
                cardHolder: 'ALEX VANCE',
                expiry: '05/28',
                cardType: 'AMEX',
                colorAccent: '#adc6ff',
            },
        ],
    });
    // Budgets
    await prisma.budget.deleteMany({});
    await prisma.budget.createMany({
        data: [
            { userId: user.id, category: 'Dining & Experiences', limit: 1500.0, spent: 840.20, icon: 'utensils', color: '#3b82f6' },
            { userId: user.id, category: 'Technology & Hardware', limit: 2000.0, spent: 1450.00, icon: 'laptop', color: '#4edea3' },
            { userId: user.id, category: 'Travel & Aviation', limit: 3000.0, spent: 1280.50, icon: 'plane', color: '#adc6ff' },
            { userId: user.id, category: 'Shopping & Apparel', limit: 1200.0, spent: 640.10, icon: 'shopping-bag', color: '#ffb4ab' },
        ],
    });
    // Goals
    await prisma.goal.deleteMany({});
    await prisma.goal.createMany({
        data: [
            { userId: user.id, title: 'Real Estate Fund', target: 100000.0, current: 65000.0, category: 'Investment', targetDate: '2026-12-31', color: '#4edea3' },
            { userId: user.id, title: 'New Porsche Taycan', target: 140000.0, current: 48000.0, category: 'Vehicle', targetDate: '2027-06-30', color: '#3b82f6' },
        ],
    });
    // Transactions
    await prisma.transaction.deleteMany({});
    await prisma.transaction.createMany({
        data: [
            {
                userId: user.id,
                title: 'Apple Store Regent St',
                merchant: 'Apple Inc.',
                amount: 1499.00,
                type: 0,
                category: 'Technology & Hardware',
                date: '2026-07-22',
                time: '14:32',
                status: 'COMPLETED',
                walletName: 'Aura Platinum Card',
                icon: 'laptop',
            },
            {
                userId: user.id,
                title: 'Stripe Payout - SaaS Revenue',
                merchant: 'Stripe Payments',
                amount: 8500.00,
                type: 1,
                category: 'Salary',
                date: '2026-07-21',
                time: '09:00',
                status: 'COMPLETED',
                walletName: 'High Yield Savings',
                icon: 'arrow-down-left',
            },
            {
                userId: user.id,
                title: 'Nobu Restaurant Dinner',
                merchant: 'Nobu Hospitality',
                amount: 384.50,
                type: 0,
                category: 'Dining & Experiences',
                date: '2026-07-20',
                time: '21:15',
                status: 'COMPLETED',
                walletName: 'Aura Platinum Card',
                icon: 'utensils',
            },
            {
                userId: user.id,
                title: 'Emirates First Class Flight',
                merchant: 'Emirates Airlines',
                amount: 1280.50,
                type: 0,
                category: 'Travel & Aviation',
                date: '2026-07-18',
                time: '11:45',
                status: 'COMPLETED',
                walletName: 'Venture Capital Wallet',
                icon: 'plane',
            },
            {
                userId: user.id,
                title: 'Dividend Distribution',
                merchant: 'Vanguard Group',
                amount: 2400.00,
                type: 1,
                category: 'Investments',
                date: '2026-07-15',
                time: '08:30',
                status: 'COMPLETED',
                walletName: 'High Yield Savings',
                icon: 'trending-up',
            },
        ],
    });
    // Net Worth History
    await prisma.netWorthHistory.deleteMany({});
    await prisma.netWorthHistory.createMany({
        data: [
            { userId: user.id, month: 'Feb', netWorth: 110000.0, assets: 125000.0, liabilities: 15000.0 },
            { userId: user.id, month: 'Mar', netWorth: 118500.0, assets: 132000.0, liabilities: 13500.0 },
            { userId: user.id, month: 'Apr', netWorth: 124200.0, assets: 136000.0, liabilities: 11800.0 },
            { userId: user.id, month: 'May', netWorth: 131800.0, assets: 142000.0, liabilities: 10200.0 },
            { userId: user.id, month: 'Jun', netWorth: 138400.0, assets: 147000.0, liabilities: 8600.0 },
            { userId: user.id, month: 'Jul', netWorth: 142850.45, assets: 151000.0, liabilities: 8149.55 },
        ],
    });
    console.log('Seeding completed successfully!');
}
seed()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
