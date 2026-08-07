import { Router } from 'express';
import { getOverview } from '../controllers/overviewController';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  uploadTransactionAttachment,
  transactionAttachmentUpload,
} from '../controllers/transactionController';
import { getReport, exportReport } from '../controllers/reportController';
import { getAnalytics } from '../controllers/analyticsController';
import {
  getUserProfile,
  updateUserSettings,
  updateFcmToken,
  removeFcmToken,
  loginUser,
  registerUser,
  logoutUser,
  verifyToken,
  uploadAvatar,
  deleteUserAccount,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from '../controllers/userController';
import {
  getBusinessEntities,
  createBusinessEntity,
  updateBusinessEntity,
  deleteBusinessEntity,
} from '../controllers/businessEntityController';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from '../controllers/reminderController';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendTestNotification,
} from '../controllers/notificationController';

const router = Router();


// Auth Endpoints
router.post('/auth/login', loginUser);
router.post('/auth/register', registerUser);
router.post('/auth/logout', logoutUser);
router.get('/auth/verify', verifyToken);
router.post('/auth/upload-avatar', uploadAvatar);
router.post('/auth/forgot-password', requestPasswordReset);
router.post('/auth/forgot-password/verify-otp', verifyPasswordResetOtp);
router.post('/auth/forgot-password/reset', resetPassword);

// Overview
router.get('/overview', getOverview);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', transactionAttachmentUpload.single('attachment'), createTransaction);
router.put('/transactions/:id', transactionAttachmentUpload.single('attachment'), updateTransaction);
router.post('/transactions/upload-attachment', uploadTransactionAttachment);
router.delete('/transactions/:id', deleteTransaction);

// Reports
router.get('/reports', getReport);
router.get('/reports/export', exportReport);

// Analytics
router.get('/analytics', getAnalytics);

// User Profile & Settings
router.get('/user/profile', getUserProfile);
router.put('/user/settings', updateUserSettings);
router.post('/user/fcm-token', updateFcmToken);
router.delete('/user/fcm-token', removeFcmToken);
router.delete('/user/account', deleteUserAccount);

// Business Entities
router.get('/business-entities', getBusinessEntities);
router.post('/business-entities', createBusinessEntity);
router.put('/business-entities/:id', updateBusinessEntity);
router.delete('/business-entities/:id', deleteBusinessEntity);

// Accounts
router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Reminders
router.get('/reminders', getReminders);
router.post('/reminders', createReminder);
router.put('/reminders/:id', updateReminder);
router.delete('/reminders/:id', deleteReminder);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllNotificationsAsRead);
router.put('/notifications/:id/read', markNotificationAsRead);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/test', sendTestNotification);

export default router;

