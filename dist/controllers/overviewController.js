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
const userSelect = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
    country: true,
    sex: true,
    place: true,
    phone: true,
    currency: true,
    memberTier: true,
    proBadge: true,
    biometrics: true,
    notifications: true,
    securityPin: true,
    theme: true,
    language: true,
    createdAt: true,
    updatedAt: true,
};
const getOverview = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        // Parse optional filter query params
        const filterMonth = req.query.month ? String(req.query.month) : undefined; // e.g. "2026-07"
        const filterEntityId = req.query.entityId ? String(req.query.entityId) : undefined;
        const filterAccountId = req.query.accountId ? String(req.query.accountId) : undefined;
        let user = await db_1.prisma.user.findUnique({ where: { id: userId }, select: userSelect }).catch(() => null);
        if (!user) {
            const fallbackEmail = buildFallbackUserEmail(userId);
            user = await db_1.prisma.user
                .create({
                data: {
                    id: userId,
                    name: 'FinLap User',
                    email: fallbackEmail,
                    currency: 'INR',
                    memberTier: 'Platinum Member',
                    proBadge: true,
                    biometrics: true,
                    notifications: true,
                    securityPin: '1234',
                },
            })
                .catch(async (error) => {
                if (error?.code === 'P2002') {
                    return db_1.prisma.user.findUnique({ where: { email: fallbackEmail }, select: userSelect });
                }
                throw error;
            });
        }
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Build where clause for transactions
        const txWhere = { userId };
        if (filterEntityId && filterEntityId !== 'ALL') {
            txWhere.businessEntityId = filterEntityId;
        }
        if (filterAccountId && filterAccountId !== 'ALL') {
            txWhere.OR = [
                { fundingSource: filterAccountId },
                { walletName: filterAccountId },
            ];
        }
        const userTransactions = await db_1.prisma.transaction.findMany({
            where: txWhere,
            orderBy: { createdAt: 'desc' },
            select: transactionSummarySelect,
        });
        // Apply month filter in JS (since date is stored as string)
        let allTx = userTransactions;
        if (filterMonth && filterMonth !== 'ALL') {
            allTx = allTx.filter((t) => {
                try {
                    const d = new Date(t.date);
                    const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return txMonth === filterMonth;
                }
                catch {
                    return true;
                }
            });
        }
        const totalIncomeAmount = allTx
            .filter(isIncomeTransaction)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalExpenseAmount = allTx
            .filter((t) => !isIncomeTransaction(t))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalTransactionAmount = totalIncomeAmount - totalExpenseAmount;
        const growthPercent = totalIncomeAmount > 0 ? Math.round((totalTransactionAmount / totalIncomeAmount) * 100 * 10) / 10 : 0;
        // Build real weekly analytics from actual transactions (current week)
        const now = new Date();
        const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0..Sun=6
        const mondayStart = new Date(now);
        mondayStart.setDate(now.getDate() - dayOfWeek);
        mondayStart.setHours(0, 0, 0, 0);
        const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const weeklyAnalytics = dayNames.map((day, idx) => {
            const dayDate = new Date(mondayStart);
            dayDate.setDate(mondayStart.getDate() + idx);
            const dayStr = dayDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
            const dayTransactions = allTx.filter((t) => {
                try {
                    const txDate = new Date(t.date);
                    return txDate.toISOString().split('T')[0] === dayStr;
                }
                catch {
                    return false;
                }
            });
            const dayIncome = dayTransactions
                .filter(isIncomeTransaction)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const dayExpense = dayTransactions
                .filter((t) => !isIncomeTransaction(t))
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            return {
                day,
                income: dayIncome,
                expense: dayExpense,
                active: idx === dayOfWeek,
            };
        });
        const businessEntities = await db_1.prisma.businessEntity
            .findMany({
            where: { userId },
        })
            .catch((err) => {
            console.error('getOverview businessEntities error:', err);
            return [];
        });
        const accounts = await db_1.prisma.account
            .findMany({
            where: { userId },
        })
            .catch((err) => {
            console.error('getOverview accounts error:', err);
            return [];
        });
        // Build available months from transactions for month picker
        const monthSet = new Set();
        userTransactions.forEach((t) => {
            try {
                const d = new Date(t.date);
                const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthSet.add(m);
            }
            catch { }
        });
        const upcomingReminders = await db_1.prisma.reminder
            ?.findMany({
            where: {
                userId,
                status: { in: ['PENDING', 'OVERDUE'] },
            },
            orderBy: [{ date: 'asc' }, { time: 'asc' }],
            take: 3,
        })
            .catch((err) => {
            console.error('getOverview reminders error:', err);
            return [];
        }) ?? [];
        const availableMonths = Array.from(monthSet).sort().reverse();
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
            accounts,
            availableMonths,
            upcomingReminders,
        });
    }
    catch (error) {
        console.error('getOverview error details:', error?.stack || error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch overview metrics',
            details: error?.message || String(error),
        });
    }
};
exports.getOverview = getOverview;
