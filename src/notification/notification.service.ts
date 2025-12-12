import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmService } from './fcm.service';
import { UserEntity } from '@/common/entities/user.entity';
import { ParticipantEntity } from '@/common/entities/participant.entity';
import { NOTIFICATION_TYPES, NOTIFICATION_MESSAGES } from './notification.constants';

const EARLY_REMINDER_MINUTES = 10;

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private fcmService: FcmService,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
    ) {}

    async sendSessionStartReminderEarlyToMultiple(
        participants: ParticipantEntity[],
        sessionId: number,
        questTitle: string
    ): Promise<number> {
        const userIds = participants.map(p => p.user.userId);
        const users = await this.userRepository.findBy({ userId: userIds as any });

        const deviceTokens = users
            .map(u => u.deviceToken)
            .filter((token): token is string => !!token);

        if (deviceTokens.length === 0) {
            return 0;
        }

        const title = NOTIFICATION_MESSAGES.SESSION_REMINDER_EARLY.title;
        const body = NOTIFICATION_MESSAGES.SESSION_REMINDER_EARLY.body(questTitle, EARLY_REMINDER_MINUTES);

        return await this.fcmService.sendNotificationToMultiple(deviceTokens, {
            data: {
                type: NOTIFICATION_TYPES.SESSION_REMINDER_EARLY,
                sessionId: sessionId.toString(),
                title,
                body,
            },
        });
    }

    async sendSessionStartReminderToMultiple(
        participants: ParticipantEntity[],
        sessionId: number,
        questTitle: string
    ): Promise<number> {
        const userIds = participants.map(p => p.user.userId);
        const users = await this.userRepository.findBy({ userId: userIds as any });

        const deviceTokens = users
            .map(u => u.deviceToken)
            .filter((token): token is string => !!token);

        if (deviceTokens.length === 0) {
            return 0;
        }

        const title = NOTIFICATION_MESSAGES.SESSION_START.title;
        const body = NOTIFICATION_MESSAGES.SESSION_START.body(questTitle);

        return await this.fcmService.sendNotificationToMultiple(deviceTokens, {
            data: {
                type: NOTIFICATION_TYPES.SESSION_START,
                sessionId: sessionId.toString(),
                title,
                body,
            },
        });
    }

    async sendSessionEndedNotification(
        participant: ParticipantEntity,
        sessionId: number,
        questTitle: string,
        finished: boolean,
        rank?: number,
        totalScore?: number
    ): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { userId: participant.user.userId },
        });

        if (!user?.deviceToken) {
            return;
        }

        let title: string;
        let body: string;

        if (finished && rank !== undefined && totalScore !== undefined) {
            title = NOTIFICATION_MESSAGES.SESSION_ENDED_WITH_RESULTS.title;
            body = NOTIFICATION_MESSAGES.SESSION_ENDED_WITH_RESULTS.body(questTitle, rank, totalScore);
        } else {
            title = NOTIFICATION_MESSAGES.SESSION_ENDED.title;
            body = NOTIFICATION_MESSAGES.SESSION_ENDED.body(questTitle);
        }

        await this.fcmService.sendNotification(user.deviceToken, {
            data: {
                type: NOTIFICATION_TYPES.SESSION_ENDED,
                sessionId: sessionId.toString(),
                finished: finished.toString(),
                title,
                body,
                ...(rank !== undefined && { rank: rank.toString() }),
                ...(totalScore !== undefined && { totalScore: totalScore.toString() }),
            },
        });
    }

    async sendRejectionNotification(
        participant: ParticipantEntity,
        sessionId: number,
        questTitle: string
    ): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { userId: participant.user.userId },
        });

        if (!user?.deviceToken) {
            return;
        }

        const title = NOTIFICATION_MESSAGES.PARTICIPANT_REJECTED.title;
        const body = NOTIFICATION_MESSAGES.PARTICIPANT_REJECTED.body(questTitle);

        await this.fcmService.sendNotification(user.deviceToken, {
            data: {
                type: NOTIFICATION_TYPES.PARTICIPANT_REJECTED,
                sessionId: sessionId.toString(),
                title,
                body,
            },
        });
    }

    async sendSessionCancelledNotificationToMultiple(
        participants: ParticipantEntity[],
        sessionId: number,
        questTitle: string
    ): Promise<number> {
        const userIds = participants.map(p => p.user.userId);
        const users = await this.userRepository.findBy({ userId: userIds as any });

        const deviceTokens = users
            .map(u => u.deviceToken)
            .filter((token): token is string => !!token);

        if (deviceTokens.length === 0) {
            return 0;
        }

        const title = NOTIFICATION_MESSAGES.SESSION_CANCELLED.title;
        const body = NOTIFICATION_MESSAGES.SESSION_CANCELLED.body(questTitle);

        return await this.fcmService.sendNotificationToMultiple(deviceTokens, {
            data: {
                type: NOTIFICATION_TYPES.SESSION_CANCELLED,
                sessionId: sessionId.toString(),
                title,
                body,
            },
        });
    }
}