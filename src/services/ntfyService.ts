import http from 'http';
import https from 'https';

export interface NtfyPayload {
  topic: string;
  title: string;
  message: string;
  scheduledAt?: string | Date; // ISO string, date string, or timestamp
  priority?: number | string;  // 1 to 5, or 'max', 'high', 'default', 'low', 'min'
  tags?: string[];
  clickUrl?: string;
  actions?: any[];
}

/**
 * Format topic name safely for ntfy.sh public topics
 */
export const getUserNtfyTopic = (userId: string): string => {
  const sanitizedId = userId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32);
  return `finlap_user_${sanitizedId}`;
};

/**
 * Sends or schedules a push notification via ntfy.sh free API
 */
export const sendNtfyNotification = async (payload: NtfyPayload): Promise<{ success: boolean; topic: string; error?: string }> => {
  try {
    const topic = payload.topic || 'finlap_alerts';
    const ntfyUrl = `https://ntfy.sh/${topic}`;

    const token = process.env.NTFY_TOKEN || 'tk_4tezsmfkieq6014v3qyd9mp356ges';

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Title': payload.title || 'FinLap Notification',
      'Priority': String(payload.priority || 4),
      'Tags': (payload.tags && payload.tags.length > 0) ? payload.tags.join(',') : 'alarm,moneybag',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };


    if (payload.clickUrl) {
      headers['Click'] = payload.clickUrl;
    }

    // Process scheduled delivery header ("At" header in ntfy.sh)
    if (payload.scheduledAt) {
      const scheduledDate = new Date(payload.scheduledAt);
      if (!isNaN(scheduledDate.getTime())) {
        // Send as ISO string or unix timestamp to ntfy.sh
        headers['At'] = scheduledDate.toISOString();
      } else if (typeof payload.scheduledAt === 'string') {
        headers['At'] = payload.scheduledAt;
      }
    }

    const response = await fetch(ntfyUrl, {
      method: 'POST',
      headers,
      body: payload.message,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[ntfy.sh] Post to ${topic} responded with status ${response.status}: ${errText}`);
      return { success: false, topic, error: `HTTP ${response.status}: ${errText}` };
    }

    console.log(`[ntfy.sh] Notification successfully published/scheduled for topic: ${topic}`);
    return { success: true, topic };
  } catch (error: any) {
    console.error('[ntfy.sh] Failed to send notification:', error?.message || error);
    return { success: false, topic: payload.topic, error: error?.message || 'Network error' };
  }
};
