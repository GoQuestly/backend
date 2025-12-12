import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface NotificationPayload {
    data: Record<string, string>;
}

@Injectable()
export class FcmService implements OnModuleInit {
    private readonly logger = new Logger(FcmService.name);

    onModuleInit() {
        if (!admin.apps.length) {
            try {
                const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

                if (!serviceAccount) {
                    this.logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
                    return;
                }

                admin.initializeApp({
                    credential: admin.credential.cert(JSON.parse(serviceAccount)),
                });

                this.logger.log('Firebase Admin SDK initialized successfully');
            } catch (error) {
                this.logger.error('Failed to initialize Firebase Admin SDK:', error.message);
            }
        }
    }

    async sendNotification(
        deviceToken: string,
        payload: NotificationPayload
    ): Promise<boolean> {
        if (!deviceToken) {
            this.logger.warn('Attempted to send notification without device token');
            return false;
        }

        if (!admin.apps.length) {
            this.logger.warn('Firebase Admin SDK not initialized');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                data: payload.data,
                token: deviceToken,
                android: {
                    priority: 'high',
                },
            };

            const response = await admin.messaging().send(message);
            this.logger.log(`Notification sent successfully: ${response}`);
            return true;
        } catch (error) {
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                this.logger.warn(`Invalid or unregistered token: ${deviceToken}`);
            } else {
                this.logger.error(`Failed to send notification: ${error.message}`);
            }
            return false;
        }
    }

    async sendNotificationToMultiple(
        deviceTokens: string[],
        payload: NotificationPayload
    ): Promise<number> {
        if (!deviceTokens || deviceTokens.length === 0) {
            this.logger.warn('Attempted to send notifications without device tokens');
            return 0;
        }

        if (!admin.apps.length) {
            this.logger.warn('Firebase Admin SDK not initialized');
            return 0;
        }

        const validTokens = deviceTokens.filter(token => token && token.trim().length > 0);

        if (validTokens.length === 0) {
            return 0;
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                data: payload.data,
                tokens: validTokens,
                android: {
                    priority: 'high',
                },
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            this.logger.log(
                `Multicast notification: ${response.successCount}/${validTokens.length} sent successfully`
            );

            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        this.logger.warn(`Failed to send to token ${idx}: ${resp.error?.message}`);
                    }
                });
            }

            return response.successCount;
        } catch (error) {
            this.logger.error(`Failed to send multicast notification: ${error.message}`);
            return 0;
        }
    }
}