"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overviewController_1 = require("../controllers/overviewController");
const transactionController_1 = require("../controllers/transactionController");
const budgetController_1 = require("../controllers/budgetController");
const walletController_1 = require("../controllers/walletController");
const analyticsController_1 = require("../controllers/analyticsController");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
// Overview
router.get('/overview', overviewController_1.getOverview);
// Transactions
router.get('/transactions', transactionController_1.getTransactions);
router.post('/transactions', transactionController_1.createTransaction);
router.delete('/transactions/:id', transactionController_1.deleteTransaction);
// Budgets & Goals
router.get('/budgets', budgetController_1.getBudgets);
router.put('/budgets/:id', budgetController_1.updateBudget);
router.post('/goals', budgetController_1.createGoal);
// Wallets
router.get('/wallets', walletController_1.getWallets);
router.post('/wallets', walletController_1.createWallet);
// Analytics
router.get('/analytics', analyticsController_1.getAnalytics);
// User Profile & Settings
router.get('/user/profile', userController_1.getUserProfile);
router.put('/user/settings', userController_1.updateUserSettings);
exports.default = router;
