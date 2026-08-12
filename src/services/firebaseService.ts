const admin = require('firebase-admin');
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;

try {
  // 1. Check for FIREBASE_SERVICE_ACCOUNT raw JSON string in environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    console.log('[FCM] Firebase Admin SDK initialized via FIREBASE_SERVICE_ACCOUNT env var.');
  }
  // 2. Check for GOOGLE_APPLICATION_CREDENTIALS filepath or local serviceAccountKey.json
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    isFirebaseInitialized = true;
    console.log('[FCM] Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS file.');
  } else {
    // Check if serviceAccountKey.json or any finlap-*.json exists in backend root
    const backendRootDir = path.join(__dirname, '../../');
    const defaultKeyPath = path.join(backendRootDir, 'serviceAccountKey.json');

    let keyFilePath = fs.existsSync(defaultKeyPath) ? defaultKeyPath : null;

    if (!keyFilePath) {
      const files = fs.readdirSync(backendRootDir);
      const matchedFile = files.find((f) => f.startsWith('finlap-') && f.endsWith('.json'));
      if (matchedFile) {
        keyFilePath = path.join(backendRootDir, matchedFile);
      }
    }

    if (keyFilePath) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log(`[FCM] Firebase Admin SDK initialized successfully using key file: ${path.basename(keyFilePath)}`);
    } else {
      console.warn('[FCM] No Firebase service account credentials found. FCM push notifications will run in dry-run/logging mode.');
    }
  }
} catch (error: any) {
  console.error('[FCM] Failed to initialize Firebase Admin SDK:', error?.message || error);
}

export interface FcmNotificationPayload {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Sends FCM Push Notification to a target device token using Firebase Admin Messaging API
 */
export const sendFcmPushNotification = async (payload: FcmNotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!payload.fcmToken) {
    return { success: false, error: 'No FCM token provided' };
  }

  if (!isFirebaseInitialized) {
    console.log(`[FCM Dry-Run Log] Push notification payload targeting token [${payload.fcmToken.substring(0, 12)}...]:`, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
    return { success: true, messageId: `dry_run_${Date.now()}` };
  }

  try {
    const message: any = {
      token: payload.fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'reminders',
          priority: 'max',
          color: '#051424',
          icon: 'notification_icon',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM Push Success] Sent push notification to token [${payload.fcmToken.substring(0, 10)}...]. Message ID: ${response}`);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error(`[FCM Push Error] Failed to send push notification:`, error?.message || error);
    return { success: false, error: error?.message || 'FCM messaging error' };
  }
};
