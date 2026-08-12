"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestNotification = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotificationById = exports.getNotifications = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
// GET /api/notifications
// Retrieves user's notifications for the LAST 30 DAYS with unread count
const getNotifications = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const filter = req.query.filter || 'ALL'; // 'ALL', 'UNREAD', 'READ'
        // Compute cutoff date for 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const where = {
            userId,
            createdAt: { gte: thirtyDaysAgo },
        };
        if (filter === 'UNREAD') {
            where.isRead = false;
        }
        else if (filter === 'READ') {
            where.isRead = true;
        }
        const [notifications, unreadCount] = await Promise.all([
            db_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.notification.count({
                where: {
                    userId,
                    createdAt: { gte: thirtyDaysAgo },
                    isRead: false,
                },
            }),
        ]);
        res.json({
            success: true,
            data: notifications,
            unreadCount,
        });
    }
    catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
};
exports.getNotifications = getNotifications;
// GET /api/notifications/:id
// Fetches single notification by ID and automatically marks it as read
const getNotificationById = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        let updated = existing;
        if (!existing.isRead) {
            updated = await db_1.prisma.notification.update({
                where: { id },
                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });
        }
        const unreadCount = await db_1.prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
        res.json({ success: true, data: updated, unreadCount });
    }
    catch (error) {
        console.error('getNotificationById error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notification details' });
    }
};
exports.getNotificationById = getNotificationById;
// PUT /api/notifications/:id/read
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        const updated = await db_1.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        // Also get updated total unread count
        const unreadCount = await db_1.prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
        res.json({ success: true, data: updated, unreadCount });
    }
    catch (error) {
        console.error('markNotificationAsRead error:', error);
        res.status(500).json({ success: false, error: 'Failed to update notification status' });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// PUT /api/notifications/read-all
// Marks all notifications as read for current user
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        await db_1.prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        res.json({ success: true, message: 'All notifications marked as read', unreadCount: 0 });
    }
    catch (error) {
        console.error('markAllNotificationsAsRead error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// DELETE /api/notifications/:id
// Deletes a notification
const deleteNotification = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        await db_1.prisma.notification.delete({
            where: { id },
        });
        const unreadCount = await db_1.prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
        res.json({ success: true, message: 'Notification deleted', unreadCount });
    }
    catch (error) {
        console.error('deleteNotification error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
// POST /api/notifications/test
// Sends a test notification and logs to DB
const sendTestNotification = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const now = new Date();
        const title = 'FinLap Test Notification';
        const message = `Test notification generated at ${now.toLocaleTimeString()}. System is operating normally!`;
        // Create in-app Notification record
        const notification = await db_1.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                categoryName: 'System Test',
                scheduledAt: now,
                isRead: false,
            },
        });
        const unreadCount = await db_1.prisma.notification.count({
            where: { userId, isRead: false },
        });
        res.json({
            success: true,
            data: notification,
            unreadCount,
        });
    }
    catch (error) {
        console.error('sendTestNotification error:', error);
        res.status(500).json({ success: false, error: 'Failed to send test notification' });
    }
};
exports.sendTestNotification = sendTestNotification;
