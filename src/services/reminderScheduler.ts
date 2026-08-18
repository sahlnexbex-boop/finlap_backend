import { prisma } from '../db';
import { sendFcmPushNotification } from './firebaseService';

/**
 * Combines reminder date ("YYYY-MM-DD") and time ("HH:mm" or "02:30 PM") into a Date object.
 */
export const parseReminderDateTime = (dateStr: string, timeStr?: string | null): Date | null => {
  if (!dateStr) return null;

  try {
    const cleanDate = dateStr.trim();
    let hours = 9; // default 9:00 AM
    let minutes = 0;

    if (timeStr && timeStr.trim()) {
      let rawTime = timeStr.trim().replace(/\./g, ':');
      const pmMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (pmMatch) {
        let h = parseInt(pmMatch[1], 10);
        const m = parseInt(pmMatch[2], 10);
        const ampm = pmMatch[3].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        hours = h;
        minutes = m;
      } else {
        const parts = rawTime.split(':');
        if (parts.length >= 2) {
          hours = parseInt(parts[0], 10) || 0;
          minutes = parseInt(parts[1], 10) || 0;
        }
      }
    }

    const [year, month, day] = cleanDate.split('-').map((v) => parseInt(v, 10));
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch (e) {
    console.error('Error parsing reminder date time:', e);
    return null;
  }
};

/**
 * Schedules immediate or future in-app & FCM push notification for a given reminder
 */
export const scheduleReminderNotification = async (reminder: any) => {
  if (!reminder || !reminder.userId) return;

  const scheduledDate = parseReminderDateTime(reminder.date, reminder.time);

  // If scheduled time is due or past, ensure notification record is created
  if (!scheduledDate || scheduledDate.getTime() <= Date.now() + 1000) {
    await ensureInAppNotificationRecord(reminder, scheduledDate || new Date());
  }
};

/**
 * Creates in-app Notification DB record & sends FCM push notification ONLY if not already notified
 */
export const ensureInAppNotificationRecord = async (reminder: any, scheduledAt?: Date) => {
  try {
    if (!reminder || !reminder.userId || !reminder.id) return;

    // Check if a notification has ALREADY been created for this reminderId or title
    const existing = await (prisma as any).notification.findFirst({
      where: {
        userId: reminder.userId,
        OR: [
          { reminderId: String(reminder.id) },
          { title: reminder.title },
        ],
      },
    });

    // If notification already exists, skip duplicate creation completely
    if (existing) {
      return;
    }

    const formattedAmount = reminder.amount ? Number(reminder.amount) : null;
    await (prisma as any).notification.create({
      data: {
        userId: reminder.userId,
        reminderId: String(reminder.id),
        title: reminder.title,
        message: reminder.notes || `Reminder due for ${reminder.title}${reminder.amount ? ` ($${Number(reminder.amount).toFixed(2)})` : ''}`,
        amount: formattedAmount,
        categoryName: reminder.categoryName || 'Reminder',
        scheduledAt: scheduledAt || new Date(),
        isRead: false,
      },
    });

    // Dispatch FCM Push Notification if user has an active fcmToken and notifications enabled
    const user = await (prisma as any).user.findUnique({
      where: { id: reminder.userId },
      select: { fcmToken: true, notifications: true },
    });

    if (user && user.notifications && user.fcmToken) {
      const amountStr = reminder.amount ? `$${Number(reminder.amount).toFixed(2)}` : '';
      const bodyText = reminder.notes || `Reminder due for ${reminder.title} ${amountStr ? `(${amountStr})` : ''}`.trim();

      await sendFcmPushNotification({
        fcmToken: user.fcmToken,
        title: `Reminder: ${reminder.title}`,
        body: bodyText,
        data: {
          reminderId: String(reminder.id),
          type: 'REMINDER_DUE',
        },
      });
    }
  } catch (err) {
    console.error('[Scheduler] Error processing reminder notification:', err);
  }
};

/**
 * Background worker checking due pending reminders
 */
export const checkAndProcessDueReminders = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Find all reminders scheduled for today or earlier with status PENDING
    const dueReminders = await (prisma as any).reminder.findMany({
      where: {
        date: { lte: todayStr },
        status: 'PENDING',
      },
      take: 100,
    });

    for (const reminder of dueReminders) {
      const scheduledDateTime = parseReminderDateTime(reminder.date, reminder.time);
      if (scheduledDateTime && scheduledDateTime.getTime() <= now.getTime() + 1000) {
        await ensureInAppNotificationRecord(reminder, scheduledDateTime);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing due reminders:', error);
  }
};

/**
 * Starts periodic background scheduler (runs once per minute to check due reminders)
 */
export const startReminderScheduler = () => {
  console.log('[Scheduler] Reminder background worker started.');
  // Initial check
  checkAndProcessDueReminders();
  // Check once every minute
  setInterval(() => {
    checkAndProcessDueReminders();
  }, 60000);
};
