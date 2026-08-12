"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overviewController_1 = require("../controllers/overviewController");
const transactionController_1 = require("../controllers/transactionController");
const reportController_1 = require("../controllers/reportController");
const analyticsController_1 = require("../controllers/analyticsController");
const userController_1 = require("../controllers/userController");
const businessEntityController_1 = require("../controllers/businessEntityController");
const accountController_1 = require("../controllers/accountController");
const categoryController_1 = require("../controllers/categoryController");
const reminderController_1 = require("../controllers/reminderController");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// Auth Endpoints
router.post('/auth/login', userController_1.loginUser);
router.post('/auth/register', userController_1.registerUser);
router.post('/auth/logout', userController_1.logoutUser);
router.get('/auth/verify', userController_1.verifyToken);
router.post('/auth/upload-avatar', userController_1.uploadAvatar);
router.post('/auth/forgot-password', userController_1.requestPasswordReset);
router.post('/auth/forgot-password/verify-otp', userController_1.verifyPasswordResetOtp);
router.post('/auth/forgot-password/reset', userController_1.resetPassword);
// Overview
router.get('/overview', overviewController_1.getOverview);
// Transactions
router.get('/transactions', transactionController_1.getTransactions);
router.post('/transactions', transactionController_1.transactionAttachmentUpload.single('attachment'), transactionController_1.createTransaction);
router.put('/transactions/:id', transactionController_1.transactionAttachmentUpload.single('attachment'), transactionController_1.updateTransaction);
router.post('/transactions/upload-attachment', transactionController_1.uploadTransactionAttachment);
router.delete('/transactions/:id', transactionController_1.deleteTransaction);
// Reports
router.get('/reports', reportController_1.getReport);
router.get('/reports/export', reportController_1.exportReport);
// Analytics
router.get('/analytics', analyticsController_1.getAnalytics);
// User Profile & Settings
router.get('/user/profile', userController_1.getUserProfile);
router.put('/user/settings', userController_1.updateUserSettings);
router.post('/user/fcm-token', userController_1.updateFcmToken);
router.delete('/user/fcm-token', userController_1.removeFcmToken);
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
// Reminders
router.get('/reminders', reminderController_1.getReminders);
router.post('/reminders', reminderController_1.createReminder);
router.put('/reminders/:id', reminderController_1.updateReminder);
router.delete('/reminders/:id', reminderController_1.deleteReminder);
// Notifications
router.get('/notifications', notificationController_1.getNotifications);
router.get('/notifications/:id', notificationController_1.getNotificationById);
router.put('/notifications/read-all', notificationController_1.markAllNotificationsAsRead);
router.put('/notifications/:id/read', notificationController_1.markNotificationAsRead);
router.delete('/notifications/:id', notificationController_1.deleteNotification);
router.post('/notifications/test', notificationController_1.sendTestNotification);
exports.default = router;
