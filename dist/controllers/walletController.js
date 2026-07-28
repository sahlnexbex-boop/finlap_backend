"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWallet = exports.getWallets = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
const getWallets = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const wallets = await db_1.prisma.wallet.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
        res.json({
            success: true,
            totalBalance,
            wallets,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
    }
};
exports.getWallets = getWallets;
const createWallet = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { name, type, accountNo, balance, cardHolder, expiry, cardType, colorAccent } = req.body;
        const wallet = await db_1.prisma.wallet.create({
            data: {
                userId,
                name,
                type: type || 'CHECKING',
                accountNo: accountNo || '•••• ' + Math.floor(1000 + Math.random() * 9000),
                balance: parseFloat(balance || 0),
                cardHolder: cardHolder || 'ALEX VANCE',
                expiry: expiry || '12/28',
                cardType: cardType || 'VISA',
                colorAccent: colorAccent || '#3b82f6',
            },
        });
        res.status(201).json({ success: true, data: wallet });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create wallet' });
    }
};
exports.createWallet = createWallet;
