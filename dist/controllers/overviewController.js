"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
const TRANSACTION_TYPE = {
    EXPENSE: 0,
    INCOME: 1,
};
const isIncomeTransaction = (transaction) => transaction.type === TRANSACTION_TYPE.INCOME ||
    transaction.type === '1' ||
    transaction.type === 'INCOME' ||
    (transaction.type !== TRANSACTION_TYPE.EXPENSE && transaction.type !== '0' && transaction.type !== 'EXPENSE' && transaction.amount > 0);
const buildFallbackUserEmail = (userId) => {
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
    createdAt: true,
};
const getOverview = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        let user = await db_1.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
        if (!user) {
            const fallbackEmail = buildFallbackUserEmail(userId);
            user = await db_1.prisma.user
                .create({
                data: {
                    id: userId,
                    name: 'FinLap User',
                    email: fallbackEmail,
                    currency: 'USD',
                    memberTier: 'Platinum Member',
                    proBadge: true,
                    biometrics: true,
                    notifications: true,
                    securityPin: '1234',
                },
            })
                .catch(async (error) => {
                if (error?.code === 'P2002') {
                    return db_1.prisma.user.findUnique({ where: { email: fallbackEmail } });
                }
                throw error;
            });
        }
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const userTransactions = await db_1.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: transactionSummarySelect,
        });
        const allTx = userTransactions;
        const totalIncomeAmount = allTx
            .filter(isIncomeTransaction)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalExpenseAmount = allTx
            .filter((t) => !isIncomeTransaction(t))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalTransactionAmount = totalIncomeAmount - totalExpenseAmount;
        const growthPercent = totalIncomeAmount > 0 ? Math.round((totalTransactionAmount / totalIncomeAmount) * 100 * 10) / 10 : 0;
        const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const currentDayIndex = (new Date().getDay() + 6) % 7; // Mon=0 .. Sun=6
        const baseVals = [40, 65, 50, 85, 45, 75, 90];
        const weeklyAnalytics = dayNames.map((day, idx) => {
            return {
                day,
                val: baseVals[idx],
                active: idx === currentDayIndex,
            };
        });
        const businessEntities = await db_1.prisma.businessEntity.findMany({
            where: { userId },
        });
        res.json({
            user,
            total: totalTransactionAmount,
            income_total: totalIncomeAmount,
            expense_total: totalExpenseAmount,
            totalTransactionAmount,
            totalIncomeAmount,
            totalExpenseAmount,
            growthPercent,
            weeklyAnalytics,
            recentTransactions: allTx.slice(0, 10),
            businessEntities,
        });
    }
    catch (error) {
        console.error('getOverview error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch overview metrics' });
    }
};
exports.getOverview = getOverview;
