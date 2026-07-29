"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overviewController_1 = require("../controllers/overviewController");
const transactionController_1 = require("../controllers/transactionController");
const budgetController_1 = require("../controllers/budgetController");
const walletController_1 = require("../controllers/walletController");
const analyticsController_1 = require("../controllers/analyticsController");
const userController_1 = require("../controllers/userController");
const businessEntityController_1 = require("../controllers/businessEntityController");
const accountController_1 = require("../controllers/accountController");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
// Auth Endpoints
router.post('/auth/login', userController_1.loginUser);
router.post('/auth/register', userController_1.registerUser);
router.post('/auth/logout', userController_1.logoutUser);
router.get('/auth/verify', userController_1.verifyToken);
router.post('/auth/upload-avatar', userController_1.uploadAvatar);
// Overview
router.get('/overview', overviewController_1.getOverview);
// Transactions
router.get('/transactions', transactionController_1.getTransactions);
router.post('/transactions', transactionController_1.transactionAttachmentUpload.single('attachment'), transactionController_1.createTransaction);
router.post('/transactions/upload-attachment', transactionController_1.uploadTransactionAttachment);
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
router.delete('/user/account', userController_1.deleteUserAccount);
// Business Entities
router.get('/business-entities', businessEntityController_1.getBusinessEntities);
router.post('/business-entities', businessEntityController_1.createBusinessEntity);
router.put('/business-entities/:id', businessEntityController_1.updateBusinessEntity);
router.delete('/business-entities/:id', businessEntityController_1.deleteBusinessEntity);
// Accounts
router.get('/accounts', accountController_1.getAccounts);
router.post('/accounts', accountController_1.createAccount);
router.put('/accounts/:id', accountController_1.updateAccount);
router.delete('/accounts/:id', accountController_1.deleteAccount);
// Categories
router.get('/categories', categoryController_1.getCategories);
router.post('/categories', categoryController_1.createCategory);
router.put('/categories/:id', categoryController_1.updateCategory);
router.delete('/categories/:id', categoryController_1.deleteCategory);
exports.default = router;
