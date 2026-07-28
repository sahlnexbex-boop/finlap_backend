"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
const getAnalytics = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const history = await db_1.prisma.netWorthHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
        const budgets = await db_1.prisma.budget.findMany({
            where: { userId },
        });
        const categoryBreakdown = budgets.map((b) => ({
            category: b.category,
            amount: b.spent,
            color: b.color,
        }));
        const monthlyComparison = [
            { month: 'Jan', income: 14000, expense: 3800 },
            { month: 'Feb', income: 15500, expense: 4100 },
            { month: 'Mar', income: 15000, expense: 3900 },
            { month: 'Apr', income: 16800, expense: 4500 },
            { month: 'May', income: 17200, expense: 4000 },
            { month: 'Jun', income: 18500, expense: 4210 },
        ];
        res.json({
            success: true,
            netWorthTrend: history,
            categoryBreakdown,
            monthlyComparison,
            metrics: {
                savingsRate: '77.2%',
                spendingVelocity: '-4.8% vs last month',
                topExpenseCategory: 'Dining & Experiences',
                cashFlowHealth: 'Optimal (9.4/10)',
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
};
exports.getAnalytics = getAnalytics;
