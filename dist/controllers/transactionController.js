"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.createTransaction = exports.getTransactions = void 0;
const db_1 = require("../db");
const getTransactions = async (req, res) => {
    try {
        const { category, type, search } = req.query;
        let whereClause = {};
        if (category && category !== 'ALL') {
            whereClause.category = String(category);
        }
        if (type && type !== 'ALL') {
            whereClause.type = String(type);
        }
        let transactions = await db_1.prisma.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        if (search) {
            const query = String(search).toLowerCase();
            transactions = transactions.filter((t) => t.title.toLowerCase().includes(query) ||
                t.merchant.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query) ||
                (t.note && t.note.toLowerCase().includes(query)) ||
                (t.businessName && t.businessName.toLowerCase().includes(query)));
        }
        res.json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
const createTransaction = async (req, res) => {
    try {
        const { title, merchant, amount, type, category, walletName, businessName, businessEntityId, note, fundingSource, isRecurring, attachmentUrl, date, } = req.body;
        if (!amount) {
            return res.status(400).json({ success: false, error: 'Amount is required' });
        }
        const now = new Date();
        const dateStr = date || 'Oct 24, 2023';
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        const numericAmount = parseFloat(amount);
        const finalAmount = type === 'EXPENSE' ? -Math.abs(numericAmount) : Math.abs(numericAmount);
        const displayTitle = businessName || title || merchant || 'Business Transaction';
        const transaction = await db_1.prisma.transaction.create({
            data: {
                title: displayTitle,
                merchant: merchant || displayTitle,
                amount: finalAmount,
                type: type || (finalAmount < 0 ? 'EXPENSE' : 'INCOME'),
                category: category || 'Software',
                date: dateStr,
                time: timeStr,
                walletName: walletName || fundingSource || 'Chase Business',
                businessName: businessName || 'Nexus Dynamics LLC',
                businessEntityId,
                note: note || '',
                fundingSource: fundingSource || 'Chase Business',
                isRecurring: Boolean(isRecurring),
                attachmentUrl: attachmentUrl || null,
                icon: 'building',
                status: 'COMPLETED',
            },
        });
        res.status(201).json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Failed to create transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
};
exports.createTransaction = createTransaction;
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.prisma.transaction.delete({ where: { id } });
        res.json({ success: true, message: 'Transaction deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete transaction' });
    }
};
exports.deleteTransaction = deleteTransaction;
