import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

// GET /api/notifications
// Retrieves user's notifications for the LAST 30 DAYS with unread count
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const filter = (req.query.filter as string) || 'ALL'; // 'ALL', 'UNREAD', 'READ'

    // Compute cutoff date for 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    };

    if (filter === 'UNREAD') {
      where.isRead = false;
    } else if (filter === 'READ') {
      where.isRead = true;
    }

    const [notifications, unreadCount] = await Promise.all([
      (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).notification.count({
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
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// PUT /api/notifications/:id/read
// Marks a single notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await (prisma as any).notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const updated = await (prisma as any).notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Also get updated total unread count
    const unreadCount = await (prisma as any).notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ success: true, data: updated, unreadCount });
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification status' });
  }
};

// PUT /api/notifications/read-all
// Marks all notifications as read for current user
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);

    await (prisma as any).notification.updateMany({
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
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
};

// DELETE /api/notifications/:id
// Deletes a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await (prisma as any).notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    await (prisma as any).notification.delete({
      where: { id },
    });

    const unreadCount = await (prisma as any).notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ success: true, message: 'Notification deleted', unreadCount });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

// POST /api/notifications/test
// Sends a test notification and logs to DB
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const now = new Date();

    const title = 'FinLap Test Notification';
    const message = `Test notification generated at ${now.toLocaleTimeString()}. System is operating normally!`;

    // Create in-app Notification record
    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        title,
        message,
        categoryName: 'System Test',
        scheduledAt: now,
        isRead: false,
      },
    });

    const unreadCount = await (prisma as any).notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      success: true,
      data: notification,
      unreadCount,
    });
  } catch (error) {
    console.error('sendTestNotification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
};
