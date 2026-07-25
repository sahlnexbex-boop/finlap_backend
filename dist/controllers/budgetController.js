"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGoal = exports.updateBudget = exports.getBudgets = void 0;
const db_1 = require("../db");
const getBudgets = async (req, res) => {
    try {
        const budgets = await db_1.prisma.budget.findMany();
        const goals = await db_1.prisma.goal.findMany();
        const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
        const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
        res.json({
            success: true,
            summary: {
                totalLimit: totalBudgetLimit,
                totalSpent: totalBudgetSpent,
                remaining: totalBudgetLimit - totalBudgetSpent,
                percentageUsed: totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0,
            },
            budgets,
            goals,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
    }
};
exports.getBudgets = getBudgets;
const updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit, spent } = req.body;
        const budget = await db_1.prisma.budget.update({
            where: { id },
            data: {
                ...(limit !== undefined && { limit: parseFloat(limit) }),
                ...(spent !== undefined && { spent: parseFloat(spent) }),
            },
        });
        res.json({ success: true, data: budget });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update budget' });
    }
};
exports.updateBudget = updateBudget;
const createGoal = async (req, res) => {
    try {
        const { title, target, current, category, targetDate, color } = req.body;
        const goal = await db_1.prisma.goal.create({
            data: {
                title,
                target: parseFloat(target),
                current: parseFloat(current || 0),
                category,
                targetDate: targetDate || '2026-12-31',
                color: color || '#4edea3',
            },
        });
        res.status(201).json({ success: true, data: goal });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create goal' });
    }
};
exports.createGoal = createGoal;
