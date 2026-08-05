"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
const getAnalytics = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const transactions = await db_1.prisma.transaction.findMany({
            where: { userId },
        });
        const categoryMap = {};
        transactions.forEach((tx) => {
            if (tx.type === 0) { // Expense
                categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
            }
        });
        const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount], idx) => ({
            category,
            amount,
            color: colors[idx % colors.length],
        }));
        res.json({
            success: true,
            categoryBreakdown,
            metrics: {
                savingsRate: '77.2%',
                spendingVelocity: '-4.8% vs last month',
                topExpenseCategory: categoryBreakdown[0]?.category || 'General',
                cashFlowHealth: 'Optimal (9.4/10)',
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
};
exports.getAnalytics = getAnalytics;
