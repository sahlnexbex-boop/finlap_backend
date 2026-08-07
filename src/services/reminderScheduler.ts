import { prisma } from '../db';
import { sendFcmPushNotification } from './firebaseService';

/**
 * Combines reminder date ("YYYY-MM-DD") and time ("HH:mm" or "02:30 PM") into a Date object.
 */
export const parseReminderDateTime = (dateStr: string, timeStr?: string | null): Date | null => {
  if (!dateStr) return null;

  try {
    const cleanDate = dateStr.trim(); // e.g. "2026-08-06"
    let hours = 9; // default 9:00 AM if no time specified
    let minutes = 0;

    if (timeStr && timeStr.trim()) {
      const rawTime = timeStr.trim();
      // Check 12-hour format e.g. "02:30 PM" or "2:30 PM"
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
        // 24-hour format e.g. "14:30"
        const parts = rawTime.split(':');
        if (parts.length >= 2) {
          hours = parseInt(parts[0], 10) || 0;
          minutes = parseInt(parts[1], 10) || 0;
        }
      }
    }

    const [year, month, day] = cleanDate.split('-').map((v) => parseInt(v, 10));
    if (!year || !month || !day) return null;

    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return scheduledDate;
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

  // If scheduled time is due or past, create in-app notification record & send FCM push
  if (!scheduledDate || scheduledDate <= new Date()) {
    await ensureInAppNotificationRecord(reminder, scheduledDate || new Date());
  }
};

/**
 * Creates in-app Notification DB record & sends FCM push notification if user has registered FCM token
 */
export const ensureInAppNotificationRecord = async (reminder: any, scheduledAt?: Date) => {
  try {
    const existing = await (prisma as any).notification.findFirst({
      where: {
        userId: reminder.userId,
        reminderId: reminder.id,
      },
    });

    if (!existing) {
      const formattedAmount = reminder.amount ? Number(reminder.amount) : null;
      await (prisma as any).notification.create({
        data: {
          userId: reminder.userId,
          reminderId: reminder.id,
          title: reminder.title,
          message: reminder.notes || `Reminder due for ${reminder.title} (${reminder.amount ? `$${Number(reminder.amount).toFixed(2)}` : ''})`,
          amount: formattedAmount,
          categoryName: reminder.categoryName || 'Reminder',
          scheduledAt: scheduledAt || new Date(),
          isRead: false,
        },
      });
      console.log(`[Scheduler] In-app notification created for reminder: ${reminder.id}`);

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
    }
  } catch (err) {
    console.error('[Scheduler] Error processing reminder notification:', err);
  }
};

/**
 * Background worker checking due reminders periodically
 */
export const checkAndProcessDueReminders = async () => {
  try {
    const now = new Date();
    // Get ISO date string for today e.g. "2026-08-06"
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
      if (scheduledDateTime && scheduledDateTime <= now) {
        await ensureInAppNotificationRecord(reminder, scheduledDateTime);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing due reminders:', error);
  }
};

/**
 * Starts periodic background scheduler (runs every 45 seconds)
 */
export const startReminderScheduler = () => {
  console.log('[Scheduler] Reminder & Notification background worker started.');
  // Initial check
  checkAndProcessDueReminders();
  // Set interval every 45s
  setInterval(() => {
    checkAndProcessDueReminders();
  }, 45000);
};
