"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFcmPushNotification = void 0;
const admin = require('firebase-admin');
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs_1.default.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        isFirebaseInitialized = true;
        console.log('[FCM] Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS file.');
    }
    else {
        // Check if serviceAccountKey.json or any finlap-*.json exists in backend root
        const backendRootDir = path_1.default.join(__dirname, '../../');
        const defaultKeyPath = path_1.default.join(backendRootDir, 'serviceAccountKey.json');
        let keyFilePath = fs_1.default.existsSync(defaultKeyPath) ? defaultKeyPath : null;
        if (!keyFilePath) {
            const files = fs_1.default.readdirSync(backendRootDir);
            const matchedFile = files.find((f) => f.startsWith('finlap-') && f.endsWith('.json'));
            if (matchedFile) {
                keyFilePath = path_1.default.join(backendRootDir, matchedFile);
            }
        }
        if (keyFilePath) {
            const serviceAccount = JSON.parse(fs_1.default.readFileSync(keyFilePath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            isFirebaseInitialized = true;
            console.log(`[FCM] Firebase Admin SDK initialized successfully using key file: ${path_1.default.basename(keyFilePath)}`);
        }
        else {
            console.warn('[FCM] No Firebase service account credentials found. FCM push notifications will run in dry-run/logging mode.');
        }
    }
}
catch (error) {
    console.error('[FCM] Failed to initialize Firebase Admin SDK:', error?.message || error);
}
/**
 * Sends FCM Push Notification to a target device token using Firebase Admin Messaging API
 */
const sendFcmPushNotification = async (payload) => {
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
        const message = {
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
    }
    catch (error) {
        console.error(`[FCM Push Error] Failed to send push notification:`, error?.message || error);
        return { success: false, error: error?.message || 'FCM messaging error' };
    }
};
exports.sendFcmPushNotification = sendFcmPushNotification;
