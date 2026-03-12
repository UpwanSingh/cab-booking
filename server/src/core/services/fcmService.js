const admin = require('firebase-admin');

// Note: To make this live, the user needs to download their firebase-adminsdk.json
// from the Firebase Console and place it in the server roots, or parse from ENV.
try {
    if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines if passed via ENV
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase Admin initialized successfully');
    } else {
        console.warn('⚠️ FIREBASE_PROJECT_ID not found. Push notifications will be simulated.');
    }
} catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
}

/**
 * Send a Push Notification to a specific device
 * @param {string} fcmToken - The device's push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom payload data
 */
exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) return;

    const payload = {
        notification: { title, body },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard for handling clicks
        },
        token: fcmToken,
    };

    try {
        if (admin.apps.length > 0) {
            const response = await admin.messaging().send(payload);
            console.log('📲 Successfully sent push notification:', response);
            return response;
        } else {
            // Simulated fallback if Firebase isn't configured yet
            console.log('📲 [SIMULATED PUSH NOTIFICATION]');
            console.log(`To: ${fcmToken}\nTitle: ${title}\nBody: ${body}\nData:`, data);
            return 'simulated_success';
        }
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
        return null;
    }
};
