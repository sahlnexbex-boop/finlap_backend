"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.getAccounts = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
// GET /api/accounts
const getAccounts = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const accounts = await db_1.prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
        res.json({ success: true, totalBalance, data: accounts });
    }
    catch (error) {
        console.error('getAccounts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
};
exports.getAccounts = getAccounts;
// POST /api/accounts
const createAccount = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { name, type, balance, icon, color } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Account name is required' });
        }
        const account = await db_1.prisma.account.create({
            data: {
                userId,
                name: name.trim(),
                type: type || 'bank',
                balance: parseFloat(balance || '0'),
                icon: icon || 'landmark',
                color: color || '#3B82F6',
            },
        });
        res.status(201).json({ success: true, data: account });
    }
    catch (error) {
        console.error('createAccount error:', error);
        res.status(500).json({ success: false, error: 'Failed to create account' });
    }
};
exports.createAccount = createAccount;
// PUT /api/accounts/:id
const updateAccount = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const { name, type, balance, icon, color } = req.body;
        const existing = await db_1.prisma.account.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        const updated = await db_1.prisma.account.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(type !== undefined && { type }),
                ...(balance !== undefined && { balance: parseFloat(balance) }),
                ...(icon !== undefined && { icon }),
                ...(color !== undefined && { color }),
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('updateAccount error:', error);
        res.status(500).json({ success: false, error: 'Failed to update account' });
    }
};
exports.updateAccount = updateAccount;
// DELETE /api/accounts/:id
const deleteAccount = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.account.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        await db_1.prisma.account.delete({ where: { id } });
        res.json({ success: true, message: 'Account deleted' });
    }
    catch (error) {
        console.error('deleteAccount error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
};
exports.deleteAccount = deleteAccount;
