import { Router } from 'express';
import { getOverview } from '../controllers/overviewController';
import { getTransactions, createTransaction, deleteTransaction } from '../controllers/transactionController';
import { getBudgets, updateBudget, createGoal } from '../controllers/budgetController';
import { getWallets, createWallet } from '../controllers/walletController';
import { getAnalytics } from '../controllers/analyticsController';
import { getUserProfile, updateUserSettings } from '../controllers/userController';

const router = Router();

// Overview
router.get('/overview', getOverview);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Budgets & Goals
router.get('/budgets', getBudgets);
router.put('/budgets/:id', updateBudget);
router.post('/goals', createGoal);

// Wallets
router.get('/wallets', getWallets);
router.post('/wallets', createWallet);

// Analytics
router.get('/analytics', getAnalytics);

// User Profile & Settings
router.get('/user/profile', getUserProfile);
router.put('/user/settings', updateUserSettings);

export default router;
